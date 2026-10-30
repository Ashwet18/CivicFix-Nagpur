"""API routes for issue management."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.issue import Issue
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueStatusUpdate,
    IssueResponse,
    IssueListResponse
)

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new civic issue",
    description="Create a new civic issue report. The status defaults to 'reported' and timestamps are auto-generated."
)
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db)
) -> Issue:
    """
    Create a new civic issue.
    
    Args:
        issue_data: Issue creation data
        db: Database session
        
    Returns:
        Created issue with generated ID and timestamps
    """
    # Create new issue from validated data
    db_issue = Issue(**issue_data.model_dump())
    
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    
    return db_issue


@router.get(
    "",
    response_model=IssueListResponse,
    summary="List civic issues",
    description="Retrieve a paginated list of issues with optional filtering by status and category."
)
def list_issues(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of items to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
) -> dict:
    """
    List issues with pagination and filtering.
    
    Args:
        skip: Number of records to skip (offset)
        limit: Maximum number of records to return
        status: Optional status filter
        category: Optional category filter
        db: Database session
        
    Returns:
        Paginated list of issues with metadata
    """
    # Build base query
    query = select(Issue)
    
    # Apply filters
    if status:
        normalized_status = status.lower().strip()
        query = query.where(func.lower(Issue.status) == normalized_status)
    if category:
        normalized_category = category.strip().lower()
        query = query.where(func.lower(Issue.category) == normalized_category)
    
    # Get total count before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()
    
    # Apply ordering and pagination
    query = query.order_by(desc(Issue.created_at)).offset(skip).limit(limit)
    
    # Execute query
    issues = db.execute(query).scalars().all()
    
    return {
        "items": issues,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Get a specific issue",
    description="Retrieve detailed information about a specific issue by its ID."
)
def get_issue(
    issue_id: int = Path(..., gt=0, description="Issue ID"),
    db: Session = Depends(get_db)
) -> Issue:
    """
    Retrieve a single issue by ID.
    
    Args:
        issue_id: Issue ID (must be positive)
        db: Database session
        
    Returns:
        Issue details
        
    Raises:
        HTTPException: 404 if issue not found
    """
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id)
    ).scalar_one_or_none()
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with id {issue_id} not found"
        )
    
    return issue


@router.patch(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Update issue details",
    description="Partially update editable fields of an existing issue. Only provided fields are updated."
)
def update_issue(
    issue_id: int = Path(..., gt=0, description="Issue ID"),
    issue_data: IssueUpdate = ...,
    db: Session = Depends(get_db)
) -> Issue:
    """
    Partially update an issue.
    
    Only fields provided in the request are updated.
    ID, status, and timestamps cannot be updated through this endpoint.
    
    Args:
        issue_id: Issue ID to update
        issue_data: Fields to update
        db: Database session
        
    Returns:
        Updated issue
        
    Raises:
        HTTPException: 404 if issue not found
    """
    # Fetch existing issue
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id)
    ).scalar_one_or_none()
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with id {issue_id} not found"
        )
    
    # Update only provided fields
    update_data = issue_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(issue, field, value)
    
    db.commit()
    db.refresh(issue)
    
    return issue


@router.patch(
    "/{issue_id}/status",
    response_model=IssueResponse,
    summary="Update issue status",
    description="Update the status of an issue. Valid statuses: reported, acknowledged, in_progress, resolved, rejected."
)
def update_issue_status(
    issue_id: int = Path(..., gt=0, description="Issue ID"),
    status_data: IssueStatusUpdate = ...,
    db: Session = Depends(get_db)
) -> Issue:
    """
    Update issue status.
    
    Args:
        issue_id: Issue ID to update
        status_data: New status value
        db: Database session
        
    Returns:
        Updated issue
        
    Raises:
        HTTPException: 404 if issue not found
        HTTPException: 422 if status is invalid (handled by Pydantic validation)
    """
    # Fetch existing issue
    issue = db.execute(
        select(Issue).where(Issue.id == issue_id)
    ).scalar_one_or_none()
    
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with id {issue_id} not found"
        )
    
    # Update status (already validated and normalized by Pydantic)
    issue.status = status_data.status
    
    db.commit()
    db.refresh(issue)
    
    return issue
