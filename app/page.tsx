"use client";

import { useMemo, useRef, useState } from "react";

type JobStatus = "idle" | "running" | "stopped" | "completed";

const defaultTemplate = `<html>
  <body>
    <p style="margin:0 0 16px 0;">
      <img src="cid:sponsors_img" alt="Sponsors" style="max-width:100%;height:auto;display:block;">
    </p>
    <p>Hi {{first_name}},</p>
    <p>
      After reaching thousands of students across 10 governorates in Egypt, we are bringing together
      the most ambitious minds in one place for a life-changing experience.
    </p>
    <p>
      <strong>Next Scholar Summit 2026</strong> by ScholarX in partnership with
      <strong>EU jeel connect</strong> and <strong>European Union</strong> is not just an event - it is a turning point.
    </p>
    <p>Here is what is waiting for you:</p>
    <ul>
      <li>70+ speakers and experts from diverse fields</li>
      <li>1200+ top students and future leaders</li>
      <li>Practical workshops to build real-world skills</li>
      <li>Direct access to global opportunities, scholarships, and career paths</li>
      <li>Networking with organizations, mentors, and industry leaders</li>
      <li>Certificate of Attendance</li>
    </ul>
    <p>All of this... in just ONE day that could completely reshape your future.</p>
    <p><strong>Location:</strong> Nile University - Giza<br><strong>Date:</strong> May 1, 2026</p>
    <p>
      If your goal is to study abroad, land a global career, or create real impact - this summit was made for you.
    </p>
    <p><strong>Next Scholar - Where Global Opportunities Begin.</strong></p>
    <p>
      <strong>Reserve your spot now (FREE):</strong><br>
      <a href="https://scholar-x.org/summit-2026/" target="_blank" rel="noopener noreferrer">
        https://scholar-x.org/summit-2026/
      </a>
    </p>
    <p>Spots are limited - do not miss your chance to be part of something bigger.</p>
    <p>See you there,<br><strong>ScholarX Team</strong></p>
  </body>
</html>`;

export default function Page() {
  const [campaignName, setCampaignName] = useState("summit-2026");
  const [count, setCount] = useState(100);
  const [subject, setSubject] = useState(
    "Next Scholar Summit 2026 - Reserve Your Free Spot",
  );
  const [htmlTemplate, setHtmlTemplate] = useState(defaultTemplate);
  const [testEmail, setTestEmail] = useState("asafstevn@gmail.com");

  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const stopRequestedRef = useRef(false);

  const isRunning = status === "running";

  const canStart = useMemo(() => {
    return (
      campaignName.trim().length > 0 &&
      count > 0 &&
      subject.trim().length > 0 &&
      htmlTemplate.trim().length > 0
    );
  }, [campaignName, count, subject, htmlTemplate]);

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 120));
  }

  async function sendTestEmail() {
    setBusy(true);
    try {
      const res = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          subject,
          htmlTemplate,
          testEmail,
          firstName: "Ahmed",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test send failed");

      pushLog(`Test sent to ${json.email}`);
    } catch (err) {
      pushLog(
        `Test send failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function startSending() {
    setBusy(true);
    try {
      const saveRes = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, subject, htmlTemplate }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok)
        throw new Error(saveJson.error || "Failed to save campaign");

      const res = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, count }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start job");

      setJobId(json.job.id);
      stopRequestedRef.current = false;
      setStatus("running");
      setSent(0);
      setFailed(0);
      pushLog(`Job started: ${json.job.id}`);

      void runLoop(json.job.id);
    } catch (err) {
      setStatus("idle");
      pushLog(
        `Start failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function runLoop(currentJobId: string) {
    while (true) {
      if (stopRequestedRef.current) {
        break;
      }

      try {
        const res = await fetch("/api/jobs/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: currentJobId }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Send step failed");

        if (json.failed) {
          setFailed((v) => v + 1);
          pushLog(`Failed: ${json.email || "unknown"} - ${json.error}`);
        } else if (json.email) {
          setSent((v) => v + 1);
          pushLog(`Sent: ${json.email}`);
        }

        if (json.done) {
          const nextStatus = (json.status || "completed") as JobStatus;
          setStatus(nextStatus);
          stopRequestedRef.current = true;
          pushLog(`Job ended: ${nextStatus}`);
          break;
        }
      } catch (err) {
        stopRequestedRef.current = true;
        setStatus("stopped");
        pushLog(
          `Loop stopped by error: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        break;
      }
    }
  }

  async function stopSending() {
    if (!jobId) return;
    stopRequestedRef.current = true;
    setBusy(true);
    try {
      await fetch("/api/jobs/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      setStatus("stopped");
      pushLog("Stop requested.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Campaign Sender</h1>
      <p>
        Pick how many recipients to send, edit HTML template, then start and
        stop any time.
      </p>

      <section className="card grid">
        <div>
          <label>Campaign Name</label>
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>
        <div>
          <label>How Many To Send</label>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value || 0))}
          />
        </div>
      </section>

      <section className="card">
        <label>Email Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />

        <label style={{ marginTop: 12 }}>Test Email Address</label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />

        <label style={{ marginTop: 12 }}>
          HTML Template (use {"{{first_name}}"})
        </label>
        <textarea
          value={htmlTemplate}
          onChange={(e) => setHtmlTemplate(e.target.value)}
        />

        <div className="actions">
          <button
            disabled={busy || testEmail.trim().length === 0}
            onClick={sendTestEmail}
          >
            Send Test Email
          </button>
          <button
            disabled={busy || !canStart || isRunning}
            onClick={startSending}
          >
            Start Sending
          </button>
          <button
            className="stop"
            disabled={busy || !isRunning}
            onClick={stopSending}
          >
            Stop
          </button>
        </div>
      </section>

      <section className="card">
        <p>
          Status: <strong>{status}</strong> | Sent: <strong>{sent}</strong> |
          Failed: <strong>{failed}</strong>
        </p>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Activity</h3>
        <pre>{log.join("\n") || "No activity yet."}</pre>
      </section>
    </main>
  );
}
