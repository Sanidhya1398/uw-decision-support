"""
Generate simple test PDFs for OCR testing.
Uses reportlab if available, otherwise creates text files.

Run: python generate-test-pdfs.py
"""

import os

def create_simple_pdf_with_reportlab():
    """Create test PDF using reportlab."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch

        # Create medical report PDF
        filename = "test-medical-report.pdf"
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter

        # Header
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width/2, height - 50, "APOLLO HOSPITALS")
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 70, "Medical Examination Report")

        # Line
        c.line(50, height - 80, width - 50, height - 80)

        # Patient info
        y = height - 110
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "PATIENT INFORMATION")
        y -= 20

        c.setFont("Helvetica", 10)
        patient_info = [
            ("Name:", "Rajesh Kumar Sharma"),
            ("Age/DOB:", "45 years / 15-Mar-1979"),
            ("Gender:", "Male"),
            ("Contact:", "+91 98765 43210"),
            ("Occupation:", "Software Engineer"),
            ("Exam Date:", "28-Jan-2024"),
        ]

        for label, value in patient_info:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(50, y, label)
            c.setFont("Helvetica", 10)
            c.drawString(150, y, value)
            y -= 15

        # Physical exam
        y -= 20
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "PHYSICAL EXAMINATION")
        y -= 20

        physical_exam = [
            ("Height:", "175 cm"),
            ("Weight:", "88 kg"),
            ("BMI:", "28.7 kg/m² (Elevated)"),
            ("Blood Pressure:", "142/92 mmHg (Stage 1 Hypertension)"),
            ("Pulse Rate:", "78 bpm"),
        ]

        for label, value in physical_exam:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(50, y, label)
            c.setFont("Helvetica", 10)
            c.drawString(150, y, value)
            y -= 15

        # Medical history
        y -= 20
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "MEDICAL HISTORY")
        y -= 20

        c.setFont("Helvetica", 10)
        history = [
            "- Type 2 Diabetes Mellitus: Diagnosed 2021, on Metformin 500mg BD",
            "- Hypertension: Newly detected during this examination",
            "- Family History: Father - Cardiac arrest at age 58",
            "- Surgical History: Appendectomy (2015)",
            "- Allergies: Penicillin",
            "- Smoking: Former smoker, quit 2 years ago (10 pack-years)",
            "- Alcohol: Occasional, 2-3 drinks per week",
        ]

        for line in history:
            c.drawString(50, y, line)
            y -= 15

        # Lab results
        y -= 20
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "LABORATORY RESULTS")
        y -= 20

        c.setFont("Helvetica", 10)
        lab_results = [
            "Fasting Blood Sugar: 156 mg/dL (HIGH - Normal: 70-100)",
            "HbA1c: 7.8% (DIABETIC - Normal: <5.7%)",
            "Total Cholesterol: 242 mg/dL (HIGH - Normal: <200)",
            "LDL Cholesterol: 158 mg/dL (HIGH - Normal: <100)",
            "HDL Cholesterol: 38 mg/dL (LOW - Normal: >40)",
            "Triglycerides: 210 mg/dL (HIGH - Normal: <150)",
            "Creatinine: 1.1 mg/dL (Normal)",
            "Hemoglobin: 14.2 g/dL (Normal)",
        ]

        for line in lab_results:
            c.drawString(50, y, line)
            y -= 15

        # Diagnoses
        y -= 20
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "PRIMARY DIAGNOSES")
        y -= 20

        c.setFont("Helvetica", 10)
        diagnoses = [
            "1. Type 2 Diabetes Mellitus - Suboptimally controlled",
            "2. Essential Hypertension - Stage 1",
            "3. Dyslipidemia - Mixed hyperlipidemia",
            "4. Obesity Class I (BMI 28.7)",
        ]

        for line in diagnoses:
            c.drawString(50, y, line)
            y -= 15

        # Risk assessment
        y -= 15
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, "Risk Assessment: MODERATE TO HIGH cardiovascular risk")

        # Signature
        y -= 50
        c.line(50, y, 250, y)
        y -= 15
        c.setFont("Helvetica", 10)
        c.drawString(50, y, "Dr. Priya Mehta, MD (Internal Medicine)")
        y -= 12
        c.drawString(50, y, "MCI Reg. No: 54321 | Date: 28-Jan-2024")

        c.save()
        print(f"Created: {filename}")

        # Create lab report PDF
        filename2 = "test-lab-report.pdf"
        c = canvas.Canvas(filename2, pagesize=letter)

        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width/2, height - 50, "SRL DIAGNOSTICS")
        c.setFont("Helvetica", 10)
        c.drawCentredString(width/2, height - 65, "NABL Accredited Laboratory")
        c.drawCentredString(width/2, height - 78, "Lab ID: SRL/2024/89456")

        c.line(50, height - 90, width - 50, height - 90)

        y = height - 110
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, "Patient: Mrs. Anita Desai, 52F")
        c.drawString(350, y, "Date: 31-Jan-2024")
        y -= 15
        c.drawString(50, y, "Ref. Doctor: Dr. Vikram Singh")

        # CBC
        y -= 30
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "COMPLETE BLOOD COUNT (CBC)")
        y -= 15

        c.setFont("Helvetica", 9)
        cbc = [
            ("Hemoglobin", "10.2 g/dL", "12.0-16.0", "LOW"),
            ("RBC Count", "3.8 million/cumm", "4.0-5.5", "LOW"),
            ("WBC Count", "7,200/cumm", "4,000-11,000", "Normal"),
            ("Platelet Count", "245,000/cumm", "150,000-400,000", "Normal"),
        ]

        for test, result, ref, status in cbc:
            c.drawString(50, y, test)
            c.drawString(200, y, result)
            c.drawString(320, y, ref)
            c.drawString(450, y, status)
            y -= 12

        # Thyroid
        y -= 15
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "THYROID FUNCTION TEST")
        y -= 15

        c.setFont("Helvetica", 9)
        thyroid = [
            ("TSH", "8.72 mIU/L", "0.35-5.50", "HIGH"),
            ("Free T4", "0.68 ng/dL", "0.89-1.76", "LOW"),
            ("Anti-TPO Antibodies", "285 IU/mL", "<35", "HIGH"),
        ]

        for test, result, ref, status in thyroid:
            c.drawString(50, y, test)
            c.drawString(200, y, result)
            c.drawString(320, y, ref)
            c.drawString(450, y, status)
            y -= 12

        y -= 5
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(50, y, "Interpretation: Primary Hypothyroidism, likely Hashimoto's Thyroiditis")

        # Lipid Profile
        y -= 25
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "LIPID PROFILE")
        y -= 15

        c.setFont("Helvetica", 9)
        lipid = [
            ("Total Cholesterol", "268 mg/dL", "<200", "HIGH"),
            ("Triglycerides", "195 mg/dL", "<150", "HIGH"),
            ("HDL Cholesterol", "42 mg/dL", ">50", "LOW"),
            ("LDL Cholesterol", "187 mg/dL", "<100", "HIGH"),
        ]

        for test, result, ref, status in lipid:
            c.drawString(50, y, test)
            c.drawString(200, y, result)
            c.drawString(320, y, ref)
            c.drawString(450, y, status)
            y -= 12

        # Diabetes
        y -= 15
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "DIABETES SCREENING")
        y -= 15

        c.setFont("Helvetica", 9)
        diabetes = [
            ("Fasting Blood Glucose", "118 mg/dL", "70-100", "HIGH"),
            ("HbA1c", "6.2%", "<5.7%", "HIGH (Prediabetic)"),
        ]

        for test, result, ref, status in diabetes:
            c.drawString(50, y, test)
            c.drawString(200, y, result)
            c.drawString(320, y, ref)
            c.drawString(450, y, status)
            y -= 12

        # LFT
        y -= 15
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "LIVER FUNCTION TEST")
        y -= 15

        c.setFont("Helvetica", 9)
        lft = [
            ("SGPT (ALT)", "68 U/L", "7-35", "HIGH"),
            ("SGOT (AST)", "52 U/L", "8-33", "HIGH"),
            ("GGT", "58 U/L", "5-36", "HIGH"),
        ]

        for test, result, ref, status in lft:
            c.drawString(50, y, test)
            c.drawString(200, y, result)
            c.drawString(320, y, ref)
            c.drawString(450, y, status)
            y -= 12

        # Footer
        y -= 30
        c.line(50, y, width - 50, y)
        y -= 15
        c.setFont("Helvetica", 9)
        c.drawString(50, y, "Validated by: Dr. Renu Sharma, MD (Pathology)")

        c.save()
        print(f"Created: {filename2}")

        return True

    except ImportError:
        print("reportlab not installed. Install with: pip install reportlab")
        return False

def create_simple_text_file():
    """Create a simple text document as fallback."""
    content = """
================================================================================
                            APOLLO HOSPITALS
                    Medical Examination Report for Insurance
                        Reg. No: AH/MER/2024/15678
================================================================================

PATIENT INFORMATION
-------------------
Name:           Rajesh Kumar Sharma
Age/DOB:        45 years / 15-Mar-1979
Gender:         Male
Contact:        +91 98765 43210
Occupation:     Software Engineer
Exam Date:      28-Jan-2024

PHYSICAL EXAMINATION
--------------------
Height:         175 cm
Weight:         88 kg
BMI:            28.7 kg/m² (ELEVATED - Normal: 18.5-24.9)
Blood Pressure: 142/92 mmHg (STAGE 1 HYPERTENSION)
Pulse Rate:     78 bpm (Normal)

MEDICAL HISTORY
---------------
* Type 2 Diabetes Mellitus: Diagnosed 2021, on Metformin 500mg twice daily
* Hypertension: Newly detected during this examination
* Family History: Father - Cardiac arrest at age 58; Mother - Type 2 Diabetes
* Surgical History: Appendectomy (2015)
* Allergies: Penicillin
* Smoking: Former smoker, quit 2 years ago (10 pack-years history)
* Alcohol: Occasional - 2-3 drinks per week

LABORATORY RESULTS
------------------
Test                    Result          Reference       Status
----                    ------          ---------       ------
Fasting Blood Sugar     156 mg/dL       70-100          HIGH
HbA1c                   7.8%            <5.7%           DIABETIC
Total Cholesterol       242 mg/dL       <200            HIGH
LDL Cholesterol         158 mg/dL       <100            HIGH
HDL Cholesterol         38 mg/dL        >40             LOW
Triglycerides           210 mg/dL       <150            HIGH
Creatinine              1.1 mg/dL       0.7-1.3         Normal
Hemoglobin              14.2 g/dL       13-17           Normal

PRIMARY DIAGNOSES
-----------------
1. Type 2 Diabetes Mellitus - Suboptimally controlled (HbA1c 7.8%)
2. Essential Hypertension - Stage 1, newly diagnosed
3. Dyslipidemia - Mixed hyperlipidemia
4. Obesity Class I (BMI 28.7)

RISK ASSESSMENT
---------------
MODERATE TO HIGH cardiovascular risk based on:
- Multiple metabolic risk factors
- Family history of premature CAD
- Former smoking history

RECOMMENDATIONS
---------------
* Initiate antihypertensive therapy (ACE inhibitor)
* Start statin therapy for dyslipidemia
* Optimize diabetic control
* 2D Echocardiography recommended
* Follow-up in 3 months

================================================================================
Examining Physician: Dr. Priya Mehta, MD (Internal Medicine)
MCI Reg. No: 54321
Date: 28-Jan-2024
================================================================================
"""

    with open("test-medical-report.txt", "w") as f:
        f.write(content)
    print("Created: test-medical-report.txt")
    print("You can convert this to PDF using: https://cloudconvert.com/txt-to-pdf")

if __name__ == "__main__":
    print("Generating test documents for OCR...")
    print()

    if not create_simple_pdf_with_reportlab():
        print()
        print("Creating text file as fallback...")
        create_simple_text_file()

    print()
    print("Done! You can now test OCR with these documents.")
    print()
    print("To test OCR via API:")
    print('  curl -X POST "http://localhost:8000/api/v1/ocr/extract" -F "file=@test-medical-report.pdf"')
