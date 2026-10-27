"""Evaluation script for local Ollama complaint classification.

Runs the classification predictor against a 25-example human-reviewed dataset
and reports accuracy, per-category precision/recall/F1, and a confusion matrix.

**Important**: This script calls the locally running Ollama server and makes
one real model inference per dataset example.  It does NOT use any hosted AI
API and does NOT require an API key.

Prerequisites
-------------
1. Install Ollama:  https://ollama.com/download
2. Pull the model:  ollama pull qwen2.5:3b
3. Start the server: ollama serve
4. Optionally set environment variables in .env:
       OLLAMA_BASE_URL=http://localhost:11434
       OLLAMA_MODEL=qwen2.5:3b

Dataset note
------------
The 25-example dataset is a **preliminary evaluation only**.  Results on this
dataset are indicative and are NOT sufficient evidence of production readiness.
A statistically meaningful evaluation requires several hundred labelled examples
that were not used during prompt design.

Usage
-----
    python -m ml.evaluation.evaluate_classification

Exit codes
----------
  0 — evaluation completed (accuracy may or may not meet threshold)
  1 — configuration error or Ollama unavailable
"""

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional

# Ensure project root is on sys.path when run as a script
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ml.classification.predictor import ClassificationPredictor
from ml.classification.categories import VALID_CATEGORIES, normalize_category
from app.core.config import settings


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

class ClassificationEvaluator:
    """Measures classification performance on a labelled dataset."""

    def __init__(self, predictor: ClassificationPredictor) -> None:
        self.predictor = predictor
        self.results: List[Dict] = []
        self.confusion_matrix: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def evaluate_dataset(self, dataset_path: str) -> Dict:
        """Run evaluation on a JSON dataset file.

        Args:
            dataset_path: Path to the evaluation JSON file.

        Returns:
            Dictionary with accuracy, per-category metrics, and error details.
        """
        with open(dataset_path, encoding="utf-8") as fh:
            dataset = json.load(fh)

        total = len(dataset)
        print(f"\nEvaluating {total} examples …")
        print("=" * 72)

        correct = 0
        skipped = 0
        errors: List[Dict] = []

        for example in dataset:
            example_id = example["id"]
            title = example["title"]
            description = example["description"]
            expected_raw = example["expected_category"]

            # Validate expected category from dataset
            try:
                expected = normalize_category(expected_raw)
            except ValueError:
                print(
                    f"[{example_id:2d}] SKIP  — dataset contains unknown "
                    f"expected category '{expected_raw}'"
                )
                skipped += 1
                continue

            predicted, _confidence, status = self.predictor.predict(title, description)

            is_correct = status == "success" and predicted == expected

            if is_correct:
                correct += 1
            else:
                errors.append(
                    {
                        "id": example_id,
                        "title": title,
                        "expected": expected,
                        "predicted": predicted,
                        "status": status,
                    }
                )

            if status == "success" and predicted:
                self.confusion_matrix[expected][predicted] += 1

            self.results.append(
                {
                    "id": example_id,
                    "title": title,
                    "expected": expected,
                    "predicted": predicted,
                    "correct": is_correct,
                    "status": status,
                }
            )

            symbol = "OK" if is_correct else "XX"
            print(
                f"[{example_id:2d}] {'OK' if is_correct else 'XX'}  expected={expected:<15s}  "
                f"predicted={str(predicted):<15s}  status={status}"
            )

        evaluated = total - skipped
        accuracy = correct / evaluated if evaluated > 0 else 0.0

        print("\n" + "=" * 72)
        print(f"\nExamples evaluated : {evaluated}  (skipped: {skipped})")
        print(f"Correct            : {correct}")
        # Explicitly NOT claiming an accuracy value until the model has actually run.
        print(f"Accuracy           : {correct}/{evaluated} = {accuracy:.2%}")
        print(
            "\nNOTE: This is a preliminary result on 25 examples — "
            "not sufficient to characterise production accuracy."
        )

        category_metrics = self._calculate_category_metrics()

        print("\nPer-category metrics:")
        print("-" * 72)
        for category in sorted(VALID_CATEGORIES):
            if category in category_metrics and category_metrics[category]["count"] > 0:
                m = category_metrics[category]
                print(
                    f"  {category:<15s}  precision={m['precision']:.2%}  "
                    f"recall={m['recall']:.2%}  f1={m['f1']:.2%}  "
                    f"n={m['count']}"
                )

        if errors:
            print(f"\nMisclassifications ({len(errors)}):")
            print("-" * 72)
            for e in errors[:10]:
                print(f"  [{e['id']:2d}] {e['title'][:55]}")
                print(f"       expected={e['expected']}  got={e['predicted']}  ({e['status']})")

        return {
            "accuracy": accuracy,
            "correct": correct,
            "evaluated": evaluated,
            "skipped": skipped,
            "total": total,
            "category_metrics": category_metrics,
            "errors": errors,
        }

    def _calculate_category_metrics(self) -> Dict:
        """Return precision, recall, F1 per category."""
        metrics: Dict[str, Dict] = {}

        for category in VALID_CATEGORIES:
            tp = fp = fn = 0

            for r in self.results:
                expected = r["expected"]
                predicted = r["predicted"]
                status = r["status"]

                if status != "success":
                    if expected == category:
                        fn += 1
                    continue

                if expected == category and predicted == category:
                    tp += 1
                elif expected == category and predicted != category:
                    fn += 1
                elif expected != category and predicted == category:
                    fp += 1

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (
                2 * precision * recall / (precision + recall)
                if (precision + recall) > 0
                else 0.0
            )

            metrics[category] = {
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "count": tp + fn,
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }

        return metrics

    def print_confusion_matrix(self) -> None:
        """Print a confusion matrix for categories that appear in results."""
        if not self.confusion_matrix:
            print("\nNo confusion matrix data available (no successful predictions).")
            return

        categories = sorted(
            set(
                list(self.confusion_matrix.keys())
                + [p for preds in self.confusion_matrix.values() for p in preds]
            )
        )

        print("\nConfusion matrix (rows=expected, cols=predicted):")
        print("=" * 72)
        header = f"{'':15s} | " + "  ".join(f"{c[:9]:>9s}" for c in categories)
        print(header)
        print("-" * 72)
        for expected in categories:
            row = f"{expected:<15s} | "
            row += "  ".join(
                f"{self.confusion_matrix[expected].get(pred, 0):9d}"
                for pred in categories
            )
            print(row)


# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------

def main() -> int:
    print("=" * 72)
    print("CivicFix-Nagpur — AI Classification Evaluation (Ollama)")
    print("=" * 72)

    print(f"\nConfiguration:")
    print(f"  Ollama URL  : {settings.OLLAMA_BASE_URL}")
    print(f"  Model       : {settings.OLLAMA_MODEL}")
    print(f"  Timeout     : {settings.OLLAMA_TIMEOUT}s")

    predictor = ClassificationPredictor(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        ollama_timeout=settings.OLLAMA_TIMEOUT,
    )

    if not predictor.is_available():
        print(
            "\nERROR: Ollama server is not reachable at "
            f"{settings.OLLAMA_BASE_URL}\n"
        )
        print("To start Ollama:")
        print("  1. Install:   https://ollama.com/download")
        print(f"  2. Pull model: ollama pull {settings.OLLAMA_MODEL}")
        print("  3. Start:     ollama serve")
        print("\nThe server must be running before evaluation can proceed.")
        return 1

    print(f"  Model version: {predictor.get_model_version()}")

    dataset_path = (
        Path(__file__).parent.parent.parent / "datasets" / "classification_evaluation.json"
    )
    if not dataset_path.exists():
        print(f"\nERROR: Dataset not found at {dataset_path}")
        return 1

    evaluator = ClassificationEvaluator(predictor)

    try:
        results = evaluator.evaluate_dataset(str(dataset_path))
        evaluator.print_confusion_matrix()

        # Persist results alongside the dataset
        output_path = dataset_path.parent / "evaluation_results.json"
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print(f"\nResults saved → {output_path}")

    except Exception as exc:
        print(f"\nERROR during evaluation: {exc}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
