from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.oxml import parse_xml
from docx import Document
from PyPDF2 import PdfReader
from datetime import datetime
import os
import json
import textwrap
import shutil
import smtplib
from email.message import EmailMessage
import nltk

from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from collections import defaultdict

nltk.download("punkt")
nltk.download("stopwords")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
PPT_FOLDER = os.path.join(BASE_DIR, "generated_ppt")
LOG_FILE = os.path.join(BASE_DIR, "logs.json")
USER_FILE = os.path.join(BASE_DIR, "users.json")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PPT_FOLDER, exist_ok=True)

if not os.path.exists(USER_FILE):
    with open(USER_FILE, "w") as f:
        json.dump({}, f)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------
# Summarization Logic
# --------------------------

class EnhancedSummarizer:
    def __init__(self, max_words=1500):
        self.max_words = max_words

    def summarize(self, text, max_sentences=10):
        text = text.strip()
        if not text:
            return [], []

        words = text.split()
        if len(words) > self.max_words:
            text = " ".join(words[:self.max_words])

        sentences = sent_tokenize(text)
        if len(sentences) <= max_sentences:
            return [f"Slide {i+1}" for i in range(len(sentences))], sentences

        stop_words = set(stopwords.words("english"))
        word_freq = defaultdict(int)
        for sentence in sentences:
            for word in word_tokenize(sentence.lower()):
                if word.isalnum() and word not in stop_words:
                    word_freq[word] += 1

        max_freq = max(word_freq.values())
        for word in word_freq:
            word_freq[word] /= max_freq

        sentence_scores = defaultdict(int)
        for sentence in sentences:
            for word in word_tokenize(sentence.lower()):
                if word in word_freq:
                    sentence_scores[sentence] += word_freq[word]

        ranked = sorted(sentence_scores, key=sentence_scores.get, reverse=True)
        summary = ranked[:max_sentences]

        titles = []
        for sent in summary:
            snippet = " ".join(sent.split()[:5])
            titles.append(snippet if snippet else "Slide")

        return titles, summary


# --------------------------
# Utility Functions
# --------------------------

def load_users():
    with open(USER_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USER_FILE, "w") as f:
        json.dump(users, f, indent=2)

def load_logs():
    if not os.path.exists(LOG_FILE):
        return {}
    with open(LOG_FILE, "r") as f:
        return json.load(f)

def save_logs(logs):
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)

def add_fade_transition(slide):
    transition_xml = """
        <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" transition="fade"/>
    """
    slide._element.insert(2, parse_xml(transition_xml))

def add_header_footer(slide, username):
    header = slide.shapes.add_textbox(Inches(0.3), Inches(0.1), Inches(9), Inches(0.3))
    header_tf = header.text_frame
    header_tf.text = "Auto-generated PPT"
    header_tf.paragraphs[0].font.size = Pt(12)
    header_tf.paragraphs[0].font.bold = True
    header_tf.paragraphs[0].font.color.rgb = RGBColor(0, 0, 128)

    footer = slide.shapes.add_textbox(Inches(0.3), Inches(6.7), Inches(9), Inches(0.3))
    footer_tf = footer.text_frame
    footer_text = f"Created by {username}" if username else "Created automatically"
    footer_tf.text = f"{footer_text} on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    footer_tf.paragraphs[0].font.size = Pt(10)
    footer_tf.paragraphs[0].font.color.rgb = RGBColor(64, 64, 64)

def extract_text_from_pdf(pdf_path):
    pdf = PdfReader(pdf_path)
    text = ""
    for page in pdf.pages:
        text += page.extract_text() + "\n"
    return text.strip()


def send_email_with_attachment(to_email, subject, body, attachment_path):
    try:
        # Update below values to YOUR SMTP settings
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_user = "boopal1414@gmail.com"
        smtp_password = "apos qmfb ylka nqbt"

        msg = EmailMessage()
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        # Attach PPT file
        with open(attachment_path, "rb") as f:
            file_data = f.read()
            file_name = os.path.basename(attachment_path)

        msg.add_attachment(
            file_data,
            maintype="application",
            subtype="vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=file_name,
        )

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        return True

    except Exception as e:
        print("Email error:", str(e))
        return False


# --------------------------
# Routes
# --------------------------

@app.post("/signup")
async def signup(
    fullname: str = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(...),
    password: str = Form(...),
    re_enter_password: str = Form(...)
):
    users = load_users()

    if username in users:
        return JSONResponse(content={"message": "Username already exists."}, status_code=400)

    if password != re_enter_password:
        return JSONResponse(content={"message": "Passwords do not match."}, status_code=400)

    users[username] = {
        "fullname": fullname,
        "email": email,
        "mobile": mobile,
        "password": password
    }
    save_users(users)

    return JSONResponse(content={"message": "Signup successful."})


@app.post("/signin")
async def signin(
    username: str = Form(...),
    password: str = Form(...)
):
    users = load_users()
    user = users.get(username)
    if user and user["password"] == password:
        return JSONResponse(content={
            "message": "Signin successful.",
            "fullName": user.get("fullname"),
            "email": user.get("email"),
            "mobile": user.get("mobile")
        })
    return JSONResponse(content={"message": "Invalid credentials."}, status_code=401)


@app.post("/generate-ppt")
async def generate_ppt(
    request: Request,
    text: str = Form(""),
    reference: str = Form(""),
    images: list[UploadFile] = File(default=[]),
    doc: UploadFile = File(None),
    username: str = Form(None),
    send_via_email: str = Form("no")
):
    try:
        ip = request.client.host or "unknown"
        browser = request.headers.get("user-agent", "unknown")

        if username:
            logs = load_logs()
            logs[username] = {
                "ip": ip,
                "browser": browser,
                "history": logs.get(username, {}).get("history", []) + [text.strip()]
            }
            save_logs(logs)

        if doc:
            ext = os.path.splitext(doc.filename)[-1].lower()
            doc_path = os.path.join(UPLOAD_FOLDER, f"{username or 'anonymous'}_{doc.filename}")
            with open(doc_path, "wb") as buffer:
                shutil.copyfileobj(doc.file, buffer)

            if ext == ".docx":
                doc_obj = Document(doc_path)
                text = "\n".join([para.text for para in doc_obj.paragraphs if para.text.strip()])
            elif ext == ".pdf":
                text = extract_text_from_pdf(doc_path)
            elif ext == ".txt":
                with open(doc_path, "r", encoding="utf-8") as f:
                    text = f.read().strip()
            else:
                return JSONResponse(content={"message": f"Unsupported document format: {ext}"}, status_code=400)

        if len(text.strip().split()) > 1500:
            text = " ".join(text.strip().split()[:1500])

        summarizer = EnhancedSummarizer(max_words=1500)
        titles, summaries = summarizer.summarize(text.strip())

        if not summaries:
            return JSONResponse(content={"message": "No content to generate slides."}, status_code=400)

        image_paths = []
        for image in images:
            if image.size > 2 * 1024 * 1024:
                return JSONResponse(content={"message": f"Image {image.filename} is too large (>2MB)."}, status_code=400)

            ext = os.path.splitext(image.filename)[-1]
            image_filename = f"{ip.replace('.', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image.filename}"
            image_path = os.path.join(UPLOAD_FOLDER, image_filename)
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            image_paths.append(image_path)

        prs = Presentation()
        bullet_layout = prs.slide_layouts[1]
        title_layout = prs.slide_layouts[0]

        max_slides = 10
        for i, (title, content) in enumerate(zip(titles, summaries)):
            if i >= max_slides:
                break

            slide = prs.slides.add_slide(bullet_layout)
            add_fade_transition(slide)
            slide.shapes.title.text = title
            add_header_footer(slide, username)

            textbox = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(7.0), Inches(4.0))
            tf = textbox.text_frame
            wrapped = textwrap.wrap(content, width=80)
            for line in wrapped:
                p = tf.add_paragraph()
                p.text = f"• {line}"
                p.font.size = Pt(20)

            if i < len(image_paths):
                left = Inches(6.5)
                top = Inches(5.0)
                width = Inches(2.0)
                height = Inches(2.0)
                slide.shapes.add_picture(image_paths[i], left, top, width, height)

        if reference.strip():
            ref_slide = prs.slides.add_slide(bullet_layout)
            add_fade_transition(ref_slide)
            ref_slide.shapes.title.text = "References"
            add_header_footer(ref_slide, username)
            tf = ref_slide.placeholders[1].text_frame
            tf.clear()
            p = tf.add_paragraph()
            p.text = reference.strip()
            p.font.size = Pt(18)

        thank_slide = prs.slides.add_slide(title_layout)
        add_fade_transition(thank_slide)
        add_header_footer(thank_slide, username)
        thank_slide.shapes.title.text = "Thank You!"

        filename = f"{username or 'anonymous'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
        filepath = os.path.join(PPT_FOLDER, filename)
        prs.save(filepath)

        if send_via_email.lower() == "yes":
            if not username:
                return JSONResponse(content={"message": "Please login first to receive PPT via email."}, status_code=401)

            users = load_users()
            user = users.get(username)
            if not user:
                return JSONResponse(content={"message": "User not found."}, status_code=404)

            email = user.get("email")
            if not email:
                return JSONResponse(content={"message": "No email found for user."}, status_code=400)

            success = send_email_with_attachment(
                to_email=email,
                subject="Your Generated PPT",
                body="Please find your PPT attached.",
                attachment_path=filepath
            )

            if success:
                return JSONResponse(content={"message": f"PPT sent successfully to {email}."})
            else:
                return JSONResponse(content={"message": "Failed to send email."}, status_code=500)

        else:
            return FileResponse(
                filepath,
                media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                filename="generated_ppt.pptx"
            )

    except Exception as e:
        return JSONResponse(content={"message": f"Failed to generate PPT: {str(e)}"}, status_code=500)


@app.get("/user-history/{username}")
async def get_user_history(username: str):
    logs = load_logs()
    user_data = logs.get(username, {"browser": "unknown", "history": []})
    
    # Transform history into chat format
    history = user_data.get("history", [])
    chat_history = []
    
    for i, text in enumerate(history):
        chat_history.append({
            "id": f"chat_{i+1}",
            "title": f"Chat {i+1}",
            "timestamp": datetime.now().isoformat(),  # You might want to store actual timestamps
            "preview": text[:100] + "..." if len(text) > 100 else text
        })
    
    return JSONResponse(chat_history)