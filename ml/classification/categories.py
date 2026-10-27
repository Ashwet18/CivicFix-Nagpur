"""Authoritative list of complaint categories for CivicFix-Nagpur.

This module defines the complete set of valid complaint categories used
throughout the application for consistent classification.
"""

from typing import List, Dict

# Authoritative category list for civic complaints
VALID_CATEGORIES: List[str] = [
    "road_damage",      # Potholes, cracks, road surface issues
    "garbage",          # Waste collection, littering, illegal dumping
    "water_supply",     # Water leaks, supply issues, pipe bursts
    "drainage",         # Blocked drains, flooding, sewage issues
    "streetlight",      # Non-functional or damaged street lights
    "electricity",      # Power supply issues, electrical hazards
    "sanitation",       # Public toilets, cleanliness issues
    "public_safety",    # Unsafe conditions, hazards
    "other",            # Miscellaneous issues that don't fit above categories
]

# Mapping from legacy/alias names to standard categories
CATEGORY_ALIASES: Dict[str, str] = {
    "roads": "road_damage",
    "road": "road_damage",
    "water": "water_supply",
    "street_light": "streetlight",
    "lights": "streetlight",
    "waste": "garbage",
    "trash": "garbage",
    "sewer": "drainage",
    "drain": "drainage",
    "safety": "public_safety",
}


def normalize_category(category: str) -> str:
    """Normalize a category name to the standard form.
    
    Args:
        category: Category name (may be alias or legacy name)
        
    Returns:
        Normalized category name from VALID_CATEGORIES
        
    Raises:
        ValueError: If category is not recognized
    """
    category_lower = category.lower().strip()
    
    # Check if it's already a valid category
    if category_lower in VALID_CATEGORIES:
        return category_lower
    
    # Check if it's an alias
    if category_lower in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[category_lower]
    
    raise ValueError(f"Unknown category: {category}")


def is_valid_category(category: str) -> bool:
    """Check if a category is valid or has a known alias.
    
    Args:
        category: Category name to check
        
    Returns:
        True if category is valid or has a known alias, False otherwise
    """
    try:
        normalize_category(category)
        return True
    except ValueError:
        return False


def get_category_description(category: str) -> str:
    """Get a human-readable description of a category.
    
    Args:
        category: Category name
        
    Returns:
        Description of the category
    """
    descriptions = {
        "road_damage": "Road damage including potholes, cracks, and surface issues",
        "garbage": "Garbage and waste management issues",
        "water_supply": "Water supply problems, leaks, and pipe issues",
        "drainage": "Drainage problems, blocked drains, and flooding",
        "streetlight": "Street lighting issues and malfunctions",
        "electricity": "Electrical supply issues and hazards",
        "sanitation": "Public sanitation and cleanliness issues",
        "public_safety": "Public safety concerns and hazards",
        "other": "Other civic issues not covered by specific categories",
    }
    
    normalized = normalize_category(category)
    return descriptions.get(normalized, "Unknown category")
