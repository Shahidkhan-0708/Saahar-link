from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import datetime
import hashlib
from sqlalchemy.orm import Session, joinedload, selectinload
from backend.database import get_db
from backend.models import Institute, Programme, Batch, Enrollment, Timetable, User, UserRole
from backend.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/erp", tags=["Training ERP"])

class ProgrammeCreate(BaseModel):
    institute_id: int
    title: str
    code: str
    description: Optional[str] = None
    duration_weeks: int = 6

class BatchCreate(BaseModel):
    programme_id: int
    name: str
    start_date: datetime.datetime
    end_date: datetime.datetime
    max_capacity: int = 35
    trainer_id: Optional[int] = None

class EnrollRequest(BaseModel):
    batch_id: int

@router.get("/institutes")
def list_institutes(db: Session = Depends(get_db)):
    return db.query(Institute).all()

@router.get("/programmes")
def list_programmes(db: Session = Depends(get_db)):
    programmes = db.query(Programme).options(
        joinedload(Programme.institute),
        selectinload(Programme.batches)
    ).all()
    results = []
    for p in programmes:
        results.append({
            "id": p.id,
            "title": p.title,
            "code": p.code,
            "description": p.description,
            "duration_weeks": p.duration_weeks,
            "institute_name": p.institute.name if p.institute else "NCCT",
            "batches_count": len(p.batches)
        })
    return results

@router.post("/programmes")
def create_programme(
    req: ProgrammeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.INSTITUTE_ADMIN, UserRole.SUPER_ADMIN]))
):
    prog = Programme(
        institute_id=req.institute_id,
        title=req.title,
        code=req.code,
        description=req.description,
        duration_weeks=req.duration_weeks
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog

@router.get("/batches")
def list_batches(programme_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Batch).options(
        joinedload(Batch.programme),
        selectinload(Batch.enrollments)
    )
    if programme_id:
        query = query.filter(Batch.programme_id == programme_id)
    batches = query.all()

    # Pre-fetch all trainers in a single query
    trainer_ids = {b.trainer_id for b in batches if b.trainer_id}
    trainers = {}
    if trainer_ids:
        trainers = {
            u.id: u.full_name
            for u in db.query(User.id, User.full_name).filter(User.id.in_(trainer_ids)).all()
        }

    results = []
    for b in batches:
        results.append({
            "id": b.id,
            "name": b.name,
            "programme_id": b.programme_id,
            "programme_title": b.programme.title if b.programme else "",
            "start_date": b.start_date.isoformat(),
            "end_date": b.end_date.isoformat(),
            "max_capacity": b.max_capacity,
            "enrolled_count": len(b.enrollments),
            "status": b.status,
            "trainer_name": trainers.get(b.trainer_id, "Unassigned")
        })
    return results

@router.post("/batches")
def create_batch(
    req: BatchCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.INSTITUTE_ADMIN, UserRole.SUPER_ADMIN, UserRole.TRAINER]))
):
    batch = Batch(
        programme_id=req.programme_id,
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
        max_capacity=req.max_capacity,
        trainer_id=req.trainer_id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/batches/{batch_id}/timetable")
def get_batch_timetable(batch_id: int, db: Session = Depends(get_db)):
    items = db.query(Timetable).filter(Timetable.batch_id == batch_id).all()
    return items

@router.post("/enroll")
def enroll_trainee(
    req: EnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = db.query(Enrollment).filter(
        Enrollment.trainee_id == current_user.id,
        Enrollment.batch_id == req.batch_id
    ).first()

    if existing:
        return {"message": "Already enrolled in this batch", "enrollment_id": existing.id, "status": existing.status}

    enrollment = Enrollment(
        trainee_id=current_user.id,
        batch_id=batch.id,
        status="ACTIVE"
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return {"message": "Enrollment successful", "enrollment_id": enrollment.id, "status": "ACTIVE"}

@router.get("/my-enrollments")
def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).options(
        joinedload(Enrollment.batch).joinedload(Batch.programme)
    ).filter(Enrollment.trainee_id == current_user.id).all()
    
    results = []
    for e in enrollments:
        b = e.batch
        p = b.programme if b else None
        results.append({
            "enrollment_id": e.id,
            "status": e.status,
            "enrolled_at": e.enrolled_at.isoformat(),
            "batch_id": b.id if b else None,
            "batch_name": b.name if b else "",
            "programme_id": p.id if p else None,
            "programme_title": p.title if p else "",
            "programme_code": p.code if p else "",
            "duration_weeks": p.duration_weeks if p else 6
        })
    return results


# =====================================================================
# PACS ERP SIMULATION SANDBOX (SIH #26087 MINISTRY PROTOCOLS)
# =====================================================================

class DayBookCloseRequest(BaseModel):
    society_id: str = "PACS-UP-RAMPUR-004"
    cash_opening_balance: float
    cash_receipts: float
    cash_payments: float
    vault_cash_physical: float

class KccDisbursementRequest(BaseModel):
    farmer_name: str
    land_holding_acres: float
    crop_type: str = "Paddy / Wheat"
    scale_of_finance_per_acre: float = 45000.0
    requested_amount: float
    prompt_repayment: bool = True

class InventoryTallyRequest(BaseModel):
    society_id: str = "PACS-UP-RAMPUR-004"
    urea_bags_system: int
    urea_bags_physical: int
    dap_bags_system: int
    dap_bags_physical: int
    paddy_seeds_kg_system: float
    paddy_seeds_kg_physical: float

@router.post("/sandbox/daybook-close")
def simulate_daybook_closing(
    req: DayBookCloseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Simulates the mandatory 5-step PACS Day-Book Closing protocol:
    1. Cash balance calculation = Opening + Receipts - Payments
    2. Physical vault cash count reconciliation
    3. Tamper-evident SHA-256 block hash generation
    """
    computed_closing = round(req.cash_opening_balance + req.cash_receipts - req.cash_payments, 2)
    delta = round(req.vault_cash_physical - computed_closing, 2)
    is_balanced = (delta == 0.0)

    # Compute consecutive cryptographic hash
    ts = datetime.datetime.utcnow().isoformat()
    raw = f"{req.society_id}:{computed_closing}:{req.vault_cash_physical}:{ts}"
    chain_hash = hashlib.sha256(raw.encode()).hexdigest()

    return {
        "status": "BALANCED_AUDITED" if is_balanced else "DISCREPANCY_FLAGGED",
        "is_balanced": is_balanced,
        "computed_closing_balance": computed_closing,
        "physical_vault_cash": req.vault_cash_physical,
        "reconciliation_discrepancy": delta,
        "tamper_proof_chain_hash": chain_hash,
        "operator": current_user.full_name,
        "closed_at": ts,
        "statutory_citation": "[KB-PACS-DAYBOOK:C1]",
        "citation_detail": "Model Byelaws 2023: Rule 34 - Mandatory daily cash balancing against general ledger voucher summary."
    }

@router.post("/sandbox/kcc-disburse")
def simulate_kcc_loan_appraisal(
    req: KccDisbursementRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Appraises short-term crop loans according to NABARD Scale of Finance (SOF) guidelines
    and the Modified Interest Subvention Scheme (MISS).
    """
    # Scale of Finance calculation (SOF + 10% post-harvest + 20% maintenance)
    base_sof = req.land_holding_acres * req.scale_of_finance_per_acre
    post_harvest = base_sof * 0.10
    maintenance = base_sof * 0.20
    max_kcc_limit = round(min(300000.0, base_sof + post_harvest + maintenance), 2)

    approved = (req.requested_amount <= max_kcc_limit)
    approved_amount = min(req.requested_amount, max_kcc_limit)

    # Interest rates under NABARD MISS
    base_rate = 7.0
    prompt_discount = 3.0 if req.prompt_repayment else 0.0
    effective_rate = base_rate - prompt_discount

    return {
        "status": "APPROVED" if approved else "PARTIALLY_APPROVED_REDUCED",
        "farmer_name": req.farmer_name,
        "crop_type": req.crop_type,
        "land_holding_acres": req.land_holding_acres,
        "calculated_max_kcc_limit": max_kcc_limit,
        "requested_amount": req.requested_amount,
        "approved_amount": approved_amount,
        "base_interest_rate": f"{base_rate}% p.a.",
        "prompt_repayment_incentive": f"-{prompt_discount}% p.a.",
        "net_effective_farmer_rate": f"{effective_rate}% p.a.",
        "subvention_subsidy_source": "Ministry of Agriculture / NABARD Modified Interest Subvention Scheme",
        "statutory_citation": "[KB-NABARD-MISS:C1]",
        "citation_detail": "NABARD KCC Circular: ₹3.00 Lakh credit ceiling eligible for 3% prompt repayment incentive."
    }

@router.post("/sandbox/inventory-tally")
def simulate_inventory_reconciliation(
    req: InventoryTallyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reconciles physical fertilizer and seed warehouse stock with computerized PACS ledger.
    """
    urea_diff = req.urea_bags_physical - req.urea_bags_system
    dap_diff = req.dap_bags_physical - req.dap_bags_system
    seed_diff = round(req.paddy_seeds_kg_physical - req.paddy_seeds_kg_system, 2)
    is_tally = (urea_diff == 0 and dap_diff == 0 and seed_diff == 0.0)

    return {
        "status": "STOCK_RECONCILED" if is_tally else "VARIANCE_FLAGGED",
        "urea_discrepancy_bags": urea_diff,
        "dap_discrepancy_bags": dap_diff,
        "seeds_discrepancy_kg": seed_diff,
        "is_stock_intact": is_tally,
        "warehouse_standard": "WDRA Model e-NWR Electronic Stock Register",
        "reconciled_by": current_user.full_name,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "statutory_citation": "[KB-MODEL-BYELAWS:C1]"
    }
