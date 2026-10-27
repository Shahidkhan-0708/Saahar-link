from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
from backend.models import (
    User, TraineeSkill, Certificate, Course, Module, Lesson,
    LessonProgress, QuizAttempt, Job
)
from backend.auth import get_current_user
from backend.rag import rag_pipeline
from backend.matcher import ExplainableCandidateMatcher

router = APIRouter(prefix="/api/ai", tags=["AI Career & RAG Assistant"])

class QueryRequest(BaseModel):
    question: str

@router.post("/ask")
def ask_grounded_assistant(
    req: QueryRequest,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Real AI RAG Pipeline: Retrieves grounded knowledge from cooperative statutes,
    PACS computerization guidelines, and NCCT curriculum with source citations and refusal guardrails.
    """
    context = {
        "name": current_user.full_name if current_user else "Trainee",
        "location": current_user.location if current_user else "Rampur, UP",
        "pacs_name": current_user.pacs_name if current_user else "PACS"
    }

    result = rag_pipeline.generate_grounded_response(req.question, user_context=context)
    return result

@router.get("/skill-gap")
def get_skill_gap_analysis(
    target_role: str = "PACS Chief Accountant",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deeply connected skill-gap analysis connecting:
    Trainee -> verified skills -> completed courses -> assessment results -> certificates -> target job requirements -> missing skills -> recommended courses -> career pathway.
    """
    t_skills = db.query(TraineeSkill).options(
        joinedload(TraineeSkill.skill)
    ).filter(TraineeSkill.trainee_id == current_user.id).all()
    skill_names = [ts.skill.name for ts in t_skills if ts.skill]

    # Gather completed courses with eager loading
    courses = db.query(Course).options(
        joinedload(Course.modules).joinedload(Module.lessons)
    ).all()

    # Single query for completed lesson IDs
    completed_lids = set(
        lp[0] for lp in db.query(LessonProgress.lesson_id).filter(
            LessonProgress.trainee_id == current_user.id,
            LessonProgress.completed == True
        ).all()
    )

    completed_courses_data = []
    for c in courses:
        total = sum(len(m.lessons) for m in c.modules)
        c_lids = [l.id for m in c.modules for l in m.lessons]
        comp_count = sum(1 for lid in c_lids if lid in completed_lids)
        if comp_count > 0:
            completed_courses_data.append({
                "id": c.id,
                "title": c.title,
                "code": c.code,
                "completed_lessons": comp_count,
                "total_lessons": total
            })

    # Gather assessment results
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.trainee_id == current_user.id
    ).order_by(QuizAttempt.attempted_at.desc()).all()
    assessment_data = [{
        "quiz_id": a.quiz_id,
        "score": a.score,
        "passed": a.passed,
        "attempted_at": a.attempted_at.isoformat()
    } for a in attempts]

    # Gather certificates
    certs = db.query(Certificate).filter(
        Certificate.trainee_id == current_user.id,
        Certificate.revoked == False
    ).all()
    certs_data = [{
        "certificate_id": cert.certificate_id,
        "grade": cert.grade,
        "score": cert.score,
        "issuer": cert.issuer_name
    } for cert in certs]

    analysis = ExplainableCandidateMatcher.analyze_skill_gap(
        candidate_skills=skill_names,
        target_role=target_role,
        trainee_name=current_user.full_name,
        completed_courses=completed_courses_data,
        assessment_results=assessment_data,
        certificates=certs_data
    )
    return analysis

@router.get("/recommendations")
def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recommends courses and jobs specifically tailored to trainee's verified skill profile."""
    t_skills = db.query(TraineeSkill).options(
        joinedload(TraineeSkill.skill)
    ).filter(TraineeSkill.trainee_id == current_user.id).all()
    cand_skill_names = [ts.skill.name for ts in t_skills if ts.skill]
    has_cert = db.query(Certificate.id).filter(
        Certificate.trainee_id == current_user.id,
        Certificate.revoked == False
    ).first() is not None

    # Find jobs with highest match
    all_jobs = db.query(Job).filter(Job.status == "OPEN").all()
    scored_jobs = []
    for j in all_jobs:
        req_skills = json.loads(j.required_skills_json) if j.required_skills_json else []
        match = ExplainableCandidateMatcher.calculate_match(
            candidate_skills=cand_skill_names,
            required_skills=req_skills,
            has_certificate=has_cert,
            candidate_location=current_user.location,
            job_location=j.location,
            candidate_experience_years=1.0,
            required_experience_years=j.min_experience_years
        )
        scored_jobs.append({
            "job_id": j.id,
            "title": j.title,
            "pacs_name": j.pacs_name,
            "location": j.location,
            "salary_range": j.salary_range,
            "match": match
        })

    scored_jobs.sort(key=lambda x: x["match"]["overall_match"], reverse=True)

    # Course recommendations
    courses = db.query(Course.id, Course.title, Course.code, Course.category).all()
    rec_courses = []
    for c in courses:
        rec_courses.append({
            "course_id": c[0],
            "title": c[1],
            "code": c[2],
            "category": c[3],
            "benefit": "Fulfills mandatory competency for State Cooperative Bank recruitment."
        })

    return {
        "trainee": {
            "name": current_user.full_name,
            "skills_count": len(cand_skill_names),
            "is_certified": has_cert
        },
        "recommended_jobs": scored_jobs[:3],
        "recommended_courses": rec_courses[:2]
    }
