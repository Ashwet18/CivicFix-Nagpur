# Datasets Directory

This directory contains datasets used for training and evaluating machine learning models in the CivicFix-Nagpur platform.

## Purpose

Datasets in this directory are used for:

1. **Issue Classification**: Training models to categorize civic issues into types such as:
   - Roads and Infrastructure
   - Water Supply
   - Sanitation and Waste Management
   - Electricity and Street Lights
   - Parks and Public Spaces
   - Others

2. **Severity Estimation**: Training models to assess the severity/priority of reported issues based on:
   - Description text analysis
   - Historical resolution times
   - Impact on citizens
   - Location-based factors

3. **Duplicate Detection**: Training models to identify similar or duplicate issue reports using:
   - Text similarity algorithms
   - Geospatial proximity analysis
   - Temporal patterns

## Dataset Requirements

### Data Sources

Potential sources for training data include:

- **Existing Municipal Records**: Historical civic issue data from Nagpur Municipal Corporation
- **Public Datasets**: Open government data portals
- **Synthetic Data**: Generated data based on common civic issue patterns
- **Crowdsourced Data**: Community-contributed labeled data

### Data Format

Datasets should preferably be in the following formats:

- **CSV**: For tabular data with issue records
- **JSON/JSONL**: For structured data with nested fields
- **Parquet**: For large-scale datasets with efficient storage

### Required Fields

Training datasets should ideally contain:

- `issue_id`: Unique identifier for each issue
- `title`: Brief title/summary of the issue
- `description`: Detailed description of the issue
- `category`: Issue category/type (for classification)
- `severity`: Severity level (for severity estimation)
- `location`: Geographic coordinates or address
- `reported_date`: Date and time of reporting
- `status`: Current status (Open, In Progress, Resolved, Closed)
- `resolution_date`: Date of resolution (if applicable)
- `images`: Links or references to associated images (optional)

## Data Privacy and Compliance

**IMPORTANT**: When working with civic issue data, ensure compliance with:

### Privacy Considerations

- **Personal Information**: Remove or anonymize citizen names, contact details, and other personally identifiable information (PII)
- **Location Privacy**: Consider aggregating or fuzzing exact location coordinates if needed
- **Sensitive Issues**: Handle reports related to sensitive topics with appropriate care

### Data Licensing

- Verify that datasets are properly licensed for use in this project
- Document the source and license of each dataset
- Ensure compliance with open data licenses and terms of use
- Respect copyright and intellectual property rights

### Data Quality

- Review datasets for accuracy and completeness
- Remove or flag invalid, malformed, or inconsistent records
- Document any data cleaning or preprocessing steps
- Maintain original data sources for reproducibility

## Git Guidelines

### What NOT to Commit

**Large Dataset Files**: Do not commit large dataset files directly to Git. These files are ignored by `.gitignore`:

- `*.csv` - Large CSV files
- `*.json` - Large JSON files
- `*.jsonl` - JSON Lines files
- `*.parquet` - Parquet files
- `*.zip` - Compressed archives
- `*.tar.gz` - Compressed archives

### What TO Commit

- **This README.md**: Documentation about datasets
- **Small sample files**: Representative samples for testing (< 1MB)
- **Data schemas**: JSON schemas or table definitions
- **Data dictionaries**: Field descriptions and metadata
- **Preprocessing scripts**: Code for data cleaning and transformation

### Alternative Storage

For large datasets, consider:

- **Cloud Storage**: AWS S3, Google Cloud Storage, Azure Blob Storage
- **Git LFS**: Git Large File Storage for version-controlled large files
- **Data Registries**: DVC (Data Version Control) or similar tools
- **Institutional Storage**: University or organizational data repositories

## Dataset Versioning

When working with datasets:

1. **Document versions**: Keep track of dataset versions and changes
2. **Maintain metadata**: Record dataset statistics, creation date, and source
3. **Track preprocessing**: Document any transformations or filtering applied
4. **Reference in code**: ML training scripts should reference specific dataset versions

## Example Dataset Structure

```
datasets/
├── README.md                    # This file
├── classification/
│   ├── train.csv               # Training data (not committed if large)
│   ├── validation.csv          # Validation data
│   ├── test.csv                # Test data
│   └── schema.json             # Data schema definition
├── severity/
│   ├── train.csv
│   ├── validation.csv
│   └── test.csv
├── duplicate_detection/
│   ├── pairs_train.csv         # Pairs of issues for duplicate detection
│   └── pairs_test.csv
└── samples/
    └── civic_issues_sample.csv # Small sample for testing (< 1MB)
```

## Getting Started with Datasets

### Step 1: Acquire Data

- Identify and obtain relevant datasets from approved sources
- Ensure proper permissions and licensing
- Document data provenance

### Step 2: Data Exploration

- Examine dataset structure and contents
- Calculate basic statistics and distributions
- Identify data quality issues

### Step 3: Data Cleaning

- Handle missing values
- Remove duplicates
- Standardize formats and encodings
- Anonymize sensitive information

### Step 4: Data Splitting

- Split data into training, validation, and test sets
- Ensure representative distribution across splits
- Document split ratios and methods

### Step 5: Documentation

- Update this README with dataset details
- Create data dictionaries
- Document preprocessing steps

## Contact

For questions about datasets or to contribute new data sources, contact the ML development team.

---

**Note**: Dataset acquisition and preparation is an ongoing process. This directory will be populated as the project develops and appropriate data sources are identified.
