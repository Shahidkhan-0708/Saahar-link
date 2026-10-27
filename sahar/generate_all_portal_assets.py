from pathlib import Path
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

base_dir = Path(__file__).resolve().parent
assets_dir = str(base_dir / "frontend" / "public" / "assets")
os.makedirs(assets_dir, exist_ok=True)

W, H = 1376, 768
font_badge = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 20)
font_title = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 26)
font_body = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 15)
font_mono = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 14)

def apply_cool_civic_grade(img, blue_boost=1.12, blue_add=10):
    arr = np.array(img).astype(np.float32)
    arr[:, :, 0] *= 0.93  # R
    arr[:, :, 1] *= 0.98  # G
    arr[:, :, 2] = np.clip(arr[:, :, 2] * blue_boost + blue_add, 0, 255)  # B
    res = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    res = ImageEnhance.Contrast(res).enhance(1.08)
    res = ImageEnhance.Sharpness(res).enhance(1.15)
    return res

def add_civic_card_overlay(base_img, badge_text, badge_border_color=(37, 99, 235), card_title=None, card_desc=None, pills=None):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Bottom gradient for depth and text legibility
    for y in range(450, H):
        alpha = int(((y - 450) / (H - 450)) ** 1.3 * 225)
        # Sovereign Navy #0F172A
        draw.line([(0, y), (W, y)], fill=(15, 23, 42, alpha))
        
    # Top-Left Modern Category Badge
    if badge_text:
        bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
        bw = bbox[2] - bbox[0] + 32
        bh = bbox[3] - bbox[1] + 16
        draw.rounded_rectangle([32, 32, 32 + bw, 32 + bh], radius=8, fill=(15, 23, 42, 230), outline=badge_border_color, width=2)
        draw.text((48, 40), badge_text, font=font_badge, fill=(255, 255, 255, 255))
        
    # Bottom Glassmorphic Summary Bar
    if card_title or card_desc:
        card_top = 580 if (pills is None) else 545
        draw.rounded_rectangle([32, card_top, W - 32, 730], radius=14, fill=(15, 23, 42, 230), outline=(51, 65, 85, 230), width=1)
        
        ty = card_top + 16
        if card_title:
            draw.text((56, ty), card_title, font=font_title, fill=(255, 255, 255, 255))
            ty += 34
        if card_desc:
            draw.text((56, ty), card_desc, font=font_body, fill=(203, 213, 225, 255))
            ty += 28
            
        if pills:
            px = 56
            for ptext, pcol in pills:
                pbox = draw.textbbox((0, 0), ptext, font=font_mono)
                pw = pbox[2] - pbox[0] + 20
                draw.rounded_rectangle([px, ty + 2, px + pw, ty + 30], radius=6, fill=(30, 41, 59, 240), outline=pcol, width=1)
                draw.text((px + 10, ty + 7), ptext, font=font_mono, fill=(255, 255, 255, 255))
                px += pw + 12

    return Image.alpha_composite(base_img.convert("RGBA"), overlay).convert("RGB")

print("Initializing high-fidelity asset rendering...")

# 1. PACS Operations & Computerized Accounting
src_mgmt = os.path.join(brain_dir, "course_pacs_erp_mgmt_1793034003675.jpg")
im_mgmt = Image.open(src_mgmt).crop((320, 40, 1376, 768)).resize((W, H), Image.Resampling.LANCZOS)
im_mgmt = apply_cool_civic_grade(im_mgmt, blue_boost=1.15, blue_add=15)
res_mgmt = add_civic_card_overlay(
    im_mgmt,
    badge_text="PACS ERP 2.0 • COMPUTERIZED ACCOUNTING",
    badge_border_color=(37, 99, 235),
    card_title="Double-Entry PACS Bookkeeping & Day-Book Closing",
    card_desc="Master computerized loan accounts, cash balancing, and real-time trial balance generation compliant with Ministry guidelines.",
    pills=[("22 ERP Modules", (37, 99, 235)), ("Zero Reconciliation Lag", (16, 185, 129)), ("NCCT Certified", (245, 158, 11))]
)
res_mgmt.save(os.path.join(assets_dir, "course_coop_mgmt.jpg"), quality=95)
res_mgmt.save(os.path.join(assets_dir, "course_coop_mgmt_new_1790835041825.jpg"), quality=95)
print("Saved: course_coop_mgmt.jpg")

# 2. Multi-State Cooperative Governance & Compliance (Replaces old dirty calculator!)
src_gov = os.path.join(brain_dir, "course_cooperative_governance_1793034073623.jpg")
im_gov = Image.open(src_gov).crop((40, 30, 1336, 740)).resize((W, H), Image.Resampling.LANCZOS)
im_gov = apply_cool_civic_grade(im_gov, blue_boost=1.12, blue_add=12)
res_gov = add_civic_card_overlay(
    im_gov,
    badge_text="MSCS ACT 2023 • STATUTORY GOVERNANCE",
    badge_border_color=(37, 99, 235),
    card_title="Model Byelaws & Regulatory Compliance Architecture",
    card_desc="Statutory governance for multi-state societies, board resolutions, and cooperative ombudsman grievance mechanisms.",
    pills=[("Model Byelaws 2023", (37, 99, 235)), ("Statutory Audit", (16, 185, 129)), ("Ombudsman Mechanism", (147, 51, 234))]
)
res_gov.save(os.path.join(assets_dir, "popular_c1.jpg"), quality=95)
print("Saved: popular_c1.jpg")

# 3. NABARD Credit Delivery & KCC Appraisal
src_kcc = os.path.join(brain_dir, "rural_student_learning_laptop_1793034060514.jpg")
im_kcc = Image.open(src_kcc).resize((W, H), Image.Resampling.LANCZOS)
im_kcc = apply_cool_civic_grade(im_kcc, blue_boost=1.16, blue_add=14)
res_kcc = add_civic_card_overlay(
    im_kcc,
    badge_text="NABARD GUIDELINES • KISAN CREDIT CARD (KCC)",
    badge_border_color=(37, 99, 235),
    card_title="Agricultural Priority Credit & Interest Subvention",
    card_desc="End-to-end crop loan sanctioning under Modified Interest Subvention Scheme (MISS) with 3% prompt repayment incentive.",
    pills=[("Normal Rate: 7.0%", (37, 99, 235)), ("Prompt Incentive: -3.0%", (16, 185, 129)), ("Effective Rate: 4.0%", (245, 158, 11))]
)
res_kcc.save(os.path.join(assets_dir, "popular_c2.jpg"), quality=95)
print("Saved: popular_c2.jpg")

# 4. Digital Tools & Biometric Kiosk Operations
src_bio = os.path.join(brain_dir, "course_digital_biometric_tools_1793034023551.jpg")
im_bio = Image.open(src_bio).crop((30, 20, 1346, 748)).resize((W, H), Image.Resampling.LANCZOS)
im_bio = apply_cool_civic_grade(im_bio, blue_boost=1.18, blue_add=18)
res_bio = add_civic_card_overlay(
    im_bio,
    badge_text="EDGE HARDWARE • SUB-80ms BIOMETRIC KIOSK",
    badge_border_color=(37, 99, 235),
    card_title="Doorway Tablet Attendance & Offline NVRAM Buffering",
    card_desc="Ruggedized 8-inch tablet deployment with MobileFaceNet INT8 on-device matching and cryptographic HMAC chaining.",
    pills=[("Latency: 78.4ms", (37, 99, 235)), ("50,000 Event NVRAM", (16, 185, 129)), ("SHA-256 Hash Chaining", (245, 158, 11))]
)
res_bio.save(os.path.join(assets_dir, "course_digital_tools.jpg"), quality=95)
print("Saved: course_digital_tools.jpg")

# 5. Agricultural Value Chain & Warehouse Management (popular_c3)
im_wh = Image.open(src_kcc).crop((100, 50, 1276, 718)).resize((W, H), Image.Resampling.LANCZOS)
# Tone grade towards crisp agricultural emerald and civic navy
arr_wh = np.array(im_wh).astype(np.float32)
arr_wh[:, :, 0] *= 0.88
arr_wh[:, :, 1] = np.clip(arr_wh[:, :, 1] * 1.05 + 10, 0, 255)
arr_wh[:, :, 2] = np.clip(arr_wh[:, :, 2] * 1.15 + 15, 0, 255)
im_wh_graded = Image.fromarray(np.clip(arr_wh, 0, 255).astype(np.uint8))
im_wh_graded = ImageEnhance.Contrast(im_wh_graded).enhance(1.1)

res_wh = add_civic_card_overlay(
    im_wh_graded,
    badge_text="WDRA ACCREDITED • COOPERATIVE WAREHOUSING",
    badge_border_color=(16, 185, 129),
    card_title="e-NWR Receipts & Cold Storage Supply Chain",
    card_desc="Primary agricultural processing, electronic negotiable warehouse receipts, and Agriculture Infrastructure Fund (AIF) subvention.",
    pills=[("e-NWR Integration", (16, 185, 129)), ("AIF 3% Subvention", (37, 99, 235)), ("Cold Chain Storage", (245, 158, 11))]
)
res_wh.save(os.path.join(assets_dir, "popular_c3.jpg"), quality=95)
print("Saved: popular_c3.jpg")

# 6. PACS 5-Step Day-Book Closing & Cash Balancing (assessment_calc_hands)
im_audit = Image.open(src_mgmt).crop((150, 60, 1250, 720)).resize((W, H), Image.Resampling.LANCZOS)
im_audit = apply_cool_civic_grade(im_audit, blue_boost=1.18, blue_add=20)
res_audit = add_civic_card_overlay(
    im_audit,
    badge_text="STATUTORY AUDIT • 5-STEP CASH BALANCING",
    badge_border_color=(245, 158, 11),
    card_title="PACS Day-Book Closing Protocol & Cash Verification",
    card_desc="Follow the mandatory 5-step daily closing protocol to ensure zero ledger discrepancy between vault cash and digital balance sheet.",
    pills=[("Physical Cash Reconciled", (16, 185, 129)), ("Journal Posted", (37, 99, 235)), ("Tamper-Evident SHA-256", (245, 158, 11))]
)
res_audit.save(os.path.join(assets_dir, "assessment_calc_hands.jpg"), quality=95)
print("Saved: assessment_calc_hands.jpg")

# 7. impact_laptop.jpg (clean, crisp reference)
im_laptop = Image.open(src_kcc).resize((W, H), Image.Resampling.LANCZOS)
im_laptop = apply_cool_civic_grade(im_laptop, blue_boost=1.12, blue_add=10)
im_laptop.save(os.path.join(assets_dir, "impact_laptop.jpg"), quality=95)
print("Saved: impact_laptop.jpg")

# 8. lesson_video.jpg
src_vid = os.path.join(brain_dir, "pacs_training_video_preview_1793034040512.jpg")
im_vid = Image.open(src_vid).resize((W, H), Image.Resampling.LANCZOS)
im_vid = apply_cool_civic_grade(im_vid, blue_boost=1.14, blue_add=14)
# Add centered play button
vid_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
vdraw = ImageDraw.Draw(vid_overlay)
# Centered glowing play button
cx, cy = W // 2, H // 2
vdraw.ellipse([cx - 48, cy - 48, cx + 48, cy + 48], fill=(37, 99, 235, 230), outline=(255, 255, 255, 240), width=3)
# Play triangle
vdraw.polygon([(cx - 14, cy - 22), (cx + 26, cy), (cx - 14, cy + 22)], fill=(255, 255, 255, 255))
res_vid = Image.alpha_composite(im_vid.convert("RGBA"), vid_overlay).convert("RGB")
res_vid = add_civic_card_overlay(
    res_vid,
    badge_text="NCCT SMART CLASSROOM • INTERACTIVE LECTURE",
    badge_border_color=(37, 99, 235),
    card_title="Computerized PACS Operating System Architecture",
    card_desc="National Cooperative Capacity Building • Smart India Hackathon 2026 Problem Statement ID: 26087",
    pills=[("High Definition", (37, 99, 235)), ("Vernacular Audio", (16, 185, 129)), ("Interactive Sandboxes", (245, 158, 11))]
)
res_vid.save(os.path.join(assets_dir, "lesson_video.jpg"), quality=95)
print("Saved: lesson_video.jpg")

# 9. Career 1: Cooperative Manager
src_mgr = os.path.join(brain_dir, "career_coop_secretary_manager_1793034082321.jpg")
im_mgr = Image.open(src_mgr).resize((W, H), Image.Resampling.LANCZOS)
im_mgr = apply_cool_civic_grade(im_mgr, blue_boost=1.12, blue_add=12)
res_mgr = add_civic_card_overlay(
    im_mgr,
    badge_text="CAREER TRACK • COOPERATIVE GENERAL MANAGER",
    badge_border_color=(37, 99, 235),
    card_title="PACS Managing Director & General Secretary",
    card_desc="Lead society operations, credit disbursal governance, member dividends, and annual general body statutory audits.",
    pills=[("Est. Compensation: ₹3.6 - 5.5 LPA", (37, 99, 235)), ("High Industry Demand", (16, 185, 129))]
)
res_mgr.save(os.path.join(assets_dir, "career_coop_manager.jpg"), quality=95)
print("Saved: career_coop_manager.jpg")

# 10. Career 2: Rural Finance Officer
# Distinct from career_coop_manager!
im_rfo = Image.open(src_kcc).crop((80, 20, 1300, 720)).resize((W, H), Image.Resampling.LANCZOS)
im_rfo = apply_cool_civic_grade(im_rfo, blue_boost=1.15, blue_add=15)
res_rfo = add_civic_card_overlay(
    im_rfo,
    badge_text="CAREER TRACK • RURAL FINANCE OFFICER",
    badge_border_color=(16, 185, 129),
    card_title="DCCB Agricultural Credit & Recovery Officer",
    card_desc="Appraise Kisan Credit Card portfolios, verify priority sector loan applications, and execute crop insurance settlements.",
    pills=[("Est. Compensation: ₹3.2 - 4.8 LPA", (16, 185, 129)), ("High Industry Demand", (37, 99, 235))]
)
res_rfo.save(os.path.join(assets_dir, "career_rural_finance.jpg"), quality=95)
print("Saved: career_rural_finance.jpg")

# 11. Career 3: Community Development Executive
im_cde = Image.open(src_gov).crop((60, 40, 1316, 730)).resize((W, H), Image.Resampling.LANCZOS)
im_cde = apply_cool_civic_grade(im_cde, blue_boost=1.10, blue_add=10)
res_cde = add_civic_card_overlay(
    im_cde,
    badge_text="CAREER TRACK • COMMUNITY DEVELOPMENT",
    badge_border_color=(147, 51, 234),
    card_title="Village SHG & Cooperative Outreach Coordinator",
    card_desc="Drive grassroots member mobilization, women self-help group federations, and participatory cooperative governance.",
    pills=[("Est. Compensation: ₹2.8 - 4.0 LPA", (147, 51, 234)), ("Active Outreach Cadre", (37, 99, 235))]
)
res_cde.save(os.path.join(assets_dir, "career_community_dev.jpg"), quality=95)
print("Saved: career_community_dev.jpg")

# 12. Career 4: MIS & PACS Data Analyst
im_mis = Image.open(src_mgmt).crop((200, 50, 1350, 750)).resize((W, H), Image.Resampling.LANCZOS)
im_mis = apply_cool_civic_grade(im_mis, blue_boost=1.20, blue_add=20)
res_mis = add_civic_card_overlay(
    im_mis,
    badge_text="CAREER TRACK • MIS & CLOUD DATA ANALYST",
    badge_border_color=(37, 99, 235),
    card_title="National Cooperative Database (NCD) Systems Specialist",
    card_desc="Maintain cloud database synchronization, microsecond query optimization, and W3C cryptographic ledger verification.",
    pills=[("Est. Compensation: ₹3.0 - 4.5 LPA", (37, 99, 235)), ("Critical Tech Cadre", (16, 185, 129))]
)
res_mis.save(os.path.join(assets_dir, "career_mis_analyst.jpg"), quality=95)
print("Saved: career_mis_analyst.jpg")

# 13. Career 5: Agricultural Extension Officer
im_ext = Image.open(src_mgr).crop((100, 40, 1280, 730)).resize((W, H), Image.Resampling.LANCZOS)
# Warm agricultural tone with civic overlay
arr_ext = np.array(im_ext).astype(np.float32)
arr_ext[:, :, 0] = np.clip(arr_ext[:, :, 0] * 0.95 + 10, 0, 255)
arr_ext[:, :, 1] = np.clip(arr_ext[:, :, 1] * 1.05 + 12, 0, 255)
arr_ext[:, :, 2] = np.clip(arr_ext[:, :, 2] * 1.10 + 10, 0, 255)
im_ext_graded = Image.fromarray(np.clip(arr_ext, 0, 255).astype(np.uint8))
im_ext_graded = ImageEnhance.Contrast(im_ext_graded).enhance(1.08)

res_ext = add_civic_card_overlay(
    im_ext_graded,
    badge_text="CAREER TRACK • AGRICULTURAL EXTENSION OFFICER",
    badge_border_color=(245, 158, 11),
    card_title="Input Logistics & Cooperative Warehousing Specialist",
    card_desc="Manage fertilizer buffer distribution, custom hiring centers (CHCs), and certified seed supply chains for primary members.",
    pills=[("Est. Compensation: ₹2.6 - 3.8 LPA", (245, 158, 11)), ("Field Operations Cadre", (16, 185, 129))]
)
res_ext.save(os.path.join(assets_dir, "career_agri_extension.jpg"), quality=95)
res_ext.save(os.path.join(assets_dir, "farmer_pacs_backdrop.jpg"), quality=95)
print("Saved: career_agri_extension.jpg and farmer_pacs_backdrop.jpg")

print("All 13 high-fidelity image assets generated successfully!")
