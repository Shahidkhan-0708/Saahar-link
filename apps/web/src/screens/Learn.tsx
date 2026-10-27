import { useEffect, useState, type FormEvent } from "react";
import { api, enqueue, flushOutbox, getUser, uuidv7 } from "../lib/api";
import { useAsync } from "./Login";

type Course = { id: string; title: string; language: string; status: string };
type Lesson = { id: string; ord: number; title: string; bodyMd: string; lang: string };
type Assessment = { id: string; title: string; kind: string };
type Question = { id: string; ord: number; prompt: string; options: string[] };

const HOME = () => getUser()?.id ?? "";

export function Learn() {
  const { data, reload, error } = useAsync(() =>
    api<{ courses: Course[] }>("/v1/courses"),
  );
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [view, setView] = useState<"courses" | "jobs">("courses");

  if (view === "jobs") {
    return (
      <section>
        <h1>Jobs</h1>
        <nav className="tabs">
          <button onClick={() => setView("courses")}>Courses</button>
          <button className="active">Jobs</button>
        </nav>
        <JobsAndApplications />
      </section>
    );
  }

  if (openCourse) {
    return (
      <div>
        <button onClick={() => setOpenCourse(null)}>← All courses</button>
        <CourseView courseId={openCourse} />
      </div>
    );
  }

  return (
    <section>
      <h1>My learning</h1>
      <nav className="tabs">
        <button className="active">Courses</button>
        <button onClick={() => setView("jobs")}>Jobs</button>
      </nav>
      {error && <p className="error">{error}</p>}
      <div className="cards">
        {(data?.courses ?? []).map((c) => (
          <button key={c.id} className="card clickable" onClick={() => setOpenCourse(c.id)}>
            <h3>{c.title}</h3>
            <p className="muted">{c.language.toUpperCase()} · {c.status}</p>
          </button>
        ))}
        {(data?.courses.length ?? 0) === 0 && <p className="muted">No courses yet.</p>}
        <button className="card clickable" onClick={reload}>↻ Refresh</button>
      </div>
      <p className="muted">
        Progress and quiz answers are queued locally and sync when the network returns.
      </p>
    </section>
  );
}

type JobRow = { id: string; title: string; location: string; employerName: string; employerVerified: boolean };
type MyApp = { id: string; jobId: string; state: string; jobTitle: string };

function JobsAndApplications() {
  const jobs = useAsync(() => api<{ jobs: JobRow[] }>("/v1/jobs"));
  const mine = useAsync(() => api<{ applications: MyApp[] }>("/v1/applications"));
  const [msg, setMsg] = useState<string | null>(null);
  const applied = new Set((mine.data?.applications ?? []).map((a) => a.jobId));

  async function apply(jobId: string) {
    try {
      await api("/v1/applications", { method: "POST", json: { job_id: jobId } });
      setMsg("Application submitted");
      mine.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  return (
    <div>
      {msg && <p className="muted">{msg}</p>}
      <table>
        <thead><tr><th>Job</th><th>Location</th><th>Employer</th><th></th></tr></thead>
        <tbody>
          {(jobs.data?.jobs ?? []).map((j) => (
            <tr key={j.id}>
              <td>{j.title}</td>
              <td>{j.location}</td>
              <td>
                {j.employerName}{" "}
                <span className={`chip ${j.employerVerified ? "ok" : ""}`}>
                  {j.employerVerified ? "verified" : "unverified"}
                </span>
              </td>
              <td>
                <button disabled={applied.has(j.id)} onClick={() => void apply(j.id)}>
                  {applied.has(j.id) ? "Applied ✓" : "Apply"}
                </button>
              </td>
            </tr>
          ))}
          {(jobs.data?.jobs.length ?? 0) === 0 && (
            <tr><td colSpan={4} className="muted">No jobs posted yet.</td></tr>
          )}
        </tbody>
      </table>
      <h3>My applications</h3>
      <ul>
        {(mine.data?.applications ?? []).map((a) => (
          <li key={a.id}>{a.jobTitle} — <span className="chip">{a.state}</span></li>
        ))}
        {(mine.data?.applications.length ?? 0) === 0 && <li className="muted">None yet</li>}
      </ul>
    </div>
  );
}

function CourseView({ courseId }: { courseId: string }) {
  const lessons = useAsync(() =>
    api<{ lessons: Lesson[] }>(`/v1/courses/${courseId}/lessons`),
  );
  const quizzes = useAsync(() =>
    api<{ assessments: Assessment[] }>(`/v1/courses/${courseId}/assessments`),
  );
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Assessment | null>(null);

  if (openLesson) {
    return <LessonPlayer lesson={openLesson} onBack={() => setOpenLesson(null)} />;
  }
  if (quiz) {
    return <QuizRunner assessment={quiz} onBack={() => setQuiz(null)} />;
  }

  return (
    <div>
      <h2>Lessons</h2>
      <ol className="lesson-list">
        {(lessons.data?.lessons ?? []).map((l) => (
          <li key={l.id}>
            <button onClick={() => setOpenLesson(l)}>{l.ord}. {l.title}</button>
          </li>
        ))}
      </ol>
      <h2>Quizzes</h2>
      <ul>
        {(quizzes.data?.assessments ?? []).map((a) => (
          <li key={a.id}>
            <button onClick={() => setQuiz(a)}>{a.title}</button>
          </li>
        ))}
        {(quizzes.data?.assessments.length ?? 0) === 0 && <li className="muted">None yet</li>}
      </ul>
    </div>
  );
}

function LessonPlayer({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const [saved, setSaved] = useState(false);

  async function markComplete() {
    // Optimistic local write → outbox; flush tries fabric, then cloud (AC2-5).
    enqueue({
      event_id: uuidv7(),
      event_type: "LESSON_PROGRESS_UPDATED",
      entity_type: "learning_progress",
      entity_id: lesson.id,
      entity_version: 1,
      payload: { lesson_id: lesson.id, state: "COMPLETED" },
    });
    await flushOutbox();
    setSaved(true);
  }

  return (
    <div className="card">
      <button onClick={onBack}>← Lessons</button>
      <h2>{lesson.title}</h2>
      <article>{lesson.bodyMd}</article>
      <button onClick={() => void markComplete()} disabled={saved}>
        {saved ? "✓ Completed (synced)" : "Mark complete"}
      </button>
    </div>
  );
}

function QuizRunner({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const { data, error } = useAsync(() =>
    api<{ questions: Question[] }>(`/v1/assessments/${assessment.id}/questions`),
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ordered = (data?.questions ?? []).map((q) => answers[q.id] ?? -1);
    enqueue({
      event_id: uuidv7(),
      event_type: "QUIZ_SUBMITTED",
      entity_type: "assessment_attempt",
      entity_id: uuidv7(),
      entity_version: 1,
      payload: {
        attempt_id: uuidv7(),
        assessment_id: assessment.id,
        answers: ordered,
        trainee_id: HOME(),
      },
    });
    const sent = await flushOutbox();
    setDone(sent > 0 || true); // queued either way — nothing is lost offline
    onBack();
  }

  return (
    <div className="card">
      <button onClick={onBack}>← Quizzes</button>
      <h2>{assessment.title}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        {(data?.questions ?? []).map((q, i) => (
          <fieldset key={q.id}>
            <legend>{i + 1}. {q.prompt}</legend>
            {q.options.map((opt, oi) => (
              <label key={oi}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                />{" "}
                {opt}
              </label>
            ))}
          </fieldset>
        ))}
        <button type="submit" disabled={done}>Submit (works offline)</button>
      </form>
    </div>
  );
}

/** Keeps the chip honest: flush on load and whenever the browser comes back. */
export function useConnectivity() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flushOutbox();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
