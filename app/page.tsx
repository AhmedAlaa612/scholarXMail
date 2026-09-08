"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type JobStatus =
  | "idle"
  | "running"
  | "stopped"
  | "completed"
  | "limit_reached";
type SenderProfile = string;
type SenderProfileOption = {
  key: string;
  from: string;
};
type ManagedSmtpProfile = {
  key: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
};
type CampaignOption = {
  name: string;
  subject: string | null;
  html_template: string | null;
};

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

const defaultSubject = "Next Scholar Summit 2026 - Reserve Your Free Spot";

export default function Page() {
  const [campaignName, setCampaignName] = useState("summit-2026");
  const [count, setCount] = useState(100);
  const [subject, setSubject] = useState(defaultSubject);
  const [htmlTemplate, setHtmlTemplate] = useState(defaultTemplate);
  const [campaignList, setCampaignList] = useState<CampaignOption[]>([]);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [testEmail, setTestEmail] = useState("asafstevn@gmail.com");
  const [profileOptions, setProfileOptions] = useState<SenderProfileOption[]>(
    [],
  );
  const [senderProfile, setSenderProfile] = useState<SenderProfile>("gmail");

  const [dbProfiles, setDbProfiles] = useState<ManagedSmtpProfile[]>([]);
  const [profileBusy, setProfileBusy] = useState(false);
  const [newProfileKey, setNewProfileKey] = useState("");
  const [newProfileHost, setNewProfileHost] = useState("smtp.gmail.com");
  const [newProfilePort, setNewProfilePort] = useState(587);
  const [newProfileUser, setNewProfileUser] = useState("");
  const [newProfilePass, setNewProfilePass] = useState("");
  const [newProfileFrom, setNewProfileFrom] = useState("");

  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [limitProfile, setLimitProfile] = useState<string>("");
  const stopRequestedRef = useRef(false);

  const isRunning = status === "running";
  const canResume =
    !!jobId && (status === "limit_reached" || status === "stopped");

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

  async function loadProfiles() {
    try {
      const res = await fetch("/api/sender-profiles", { method: "GET" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load sender profiles");
      }

      const profiles = Array.isArray(json.profiles)
        ? (json.profiles as SenderProfileOption[])
        : [];

      setProfileOptions(profiles);
      if (profiles.length > 0) {
        setSenderProfile((current) => {
          if (profiles.some((profile) => profile.key === current)) {
            return current;
          }
          return profiles[0].key;
        });
      }
    } catch (err) {
      pushLog(
        `Could not load sender profiles: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  async function loadDbProfiles() {
    try {
      const res = await fetch("/api/smtp-profiles", { method: "GET" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load saved SMTP profiles");
      }

      setDbProfiles(
        Array.isArray(json.profiles)
          ? (json.profiles as ManagedSmtpProfile[])
          : [],
      );
    } catch (err) {
      pushLog(
        `Could not load saved SMTP profiles: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  async function addProfile() {
    const key = newProfileKey.trim();
    const host = newProfileHost.trim();
    const user = newProfileUser.trim();
    const pass = newProfilePass.trim();

    if (!key || !host || !user || !pass) {
      pushLog("Profile key, host, user, and password are required.");
      return;
    }

    setProfileBusy(true);
    try {
      const res = await fetch("/api/smtp-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          host,
          port: newProfilePort,
          user,
          pass,
          from: newProfileFrom.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add profile");

      pushLog(`Sender profile "${key}" saved.`);
      setNewProfileKey("");
      setNewProfileUser("");
      setNewProfilePass("");
      setNewProfileFrom("");

      await Promise.all([loadDbProfiles(), loadProfiles()]);
    } catch (err) {
      pushLog(
        `Add profile failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function removeProfile(key: string) {
    setProfileBusy(true);
    try {
      const res = await fetch(
        `/api/smtp-profiles?key=${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove profile");

      pushLog(`Sender profile "${key}" removed.`);
      await Promise.all([loadDbProfiles(), loadProfiles()]);
    } catch (err) {
      pushLog(
        `Remove profile failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function loadCampaigns() {
    try {
      const res = await fetch("/api/campaigns", { method: "GET" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load campaigns");
      }

      setCampaignList(
        Array.isArray(json.campaigns) ? (json.campaigns as CampaignOption[]) : [],
      );
    } catch (err) {
      pushLog(
        `Could not load campaign list: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  async function loadCampaignInto(name: string) {
    setCampaignBusy(true);
    try {
      const res = await fetch(
        `/api/campaign?campaignName=${encodeURIComponent(name)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load campaign");

      setCampaignName(json.campaign.name);
      setSubject(json.campaign.subject || defaultSubject);
      setHtmlTemplate(json.campaign.html_template || defaultTemplate);
      pushLog(`Loaded campaign "${json.campaign.name}".`);
    } catch (err) {
      pushLog(
        `Load campaign failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCampaignBusy(false);
    }
  }

  function newCampaign() {
    setCampaignName("");
    setSubject(defaultSubject);
    setHtmlTemplate(defaultTemplate);
    pushLog("Blank campaign ready — set a name, edit the template, then Save.");
  }

  async function saveCampaign() {
    if (!campaignName.trim()) {
      pushLog("Campaign name is required to save.");
      return;
    }

    setCampaignBusy(true);
    try {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignName, subject, htmlTemplate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save campaign");

      pushLog(`Campaign "${json.campaign.name}" saved.`);
      await loadCampaigns();
    } catch (err) {
      pushLog(
        `Save campaign failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCampaignBusy(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
    void loadDbProfiles();
    void loadCampaigns();
  }, []);

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
          senderProfile,
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
      void loadCampaigns();

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
          body: JSON.stringify({ jobId: currentJobId, senderProfile }),
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

          if (nextStatus === "limit_reached") {
            setLimitProfile(json.limitProfile || senderProfile);
            pushLog(
              `Profile "${json.limitProfile || senderProfile}" hit its send limit. Pick another profile and click Resume.`,
            );
          } else {
            pushLog(`Job ended: ${nextStatus}`);
          }
          break;
        }

        const delayMs = Math.floor(Math.random() * 4000) + 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
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

  async function resumeSending() {
    if (!jobId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/jobs/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resume job");

      stopRequestedRef.current = false;
      setLimitProfile("");
      setStatus("running");
      pushLog(`Resumed with profile "${senderProfile}".`);

      void runLoop(jobId);
    } catch (err) {
      pushLog(
        `Resume failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadFailed() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/campaign/failed?campaignName=${encodeURIComponent(campaignName)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load failures");

      const failed = Array.isArray(json.failed) ? json.failed : [];
      if (failed.length === 0) {
        pushLog("No permanently failed recipients recorded.");
      } else {
        pushLog(`-- ${failed.length} permanently failed recipient(s) --`);
        for (const item of failed) {
          pushLog(`Failed: ${item.email || item.participantId} - ${item.error}`);
        }
      }
    } catch (err) {
      pushLog(
        `Load failed list error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setBusy(false);
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
          <label>Load Existing Campaign</label>
          <select
            value=""
            disabled={campaignBusy}
            onChange={(e) => {
              if (e.target.value) void loadCampaignInto(e.target.value);
            }}
          >
            <option value="">-- pick a saved campaign --</option>
            {campaignList.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Campaign Name</label>
          <input
            value={campaignName}
            placeholder="new-campaign-name"
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
        <div className="actions" style={{ alignItems: "flex-end", marginTop: 0 }}>
          <button disabled={campaignBusy} onClick={newCampaign}>
            New Campaign
          </button>
          <button
            disabled={campaignBusy || !campaignName.trim()}
            onClick={saveCampaign}
          >
            Save Campaign
          </button>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Sender Profiles (SMTP)</h3>
        <p style={{ marginTop: 0 }}>
          Add or remove SMTP accounts here — no code or redeploy needed. Each
          one shows up in the &quot;Send From&quot; dropdown below.
        </p>

        {dbProfiles.length > 0 && (
          <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
            {dbProfiles.map((profile) => (
              <li
                key={profile.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span>
                  <strong>{profile.key}</strong> — {profile.from} (
                  {profile.host}:{profile.port})
                </span>
                <button
                  className="stop"
                  style={{ width: "auto", minWidth: 0, padding: "4px 10px" }}
                  disabled={profileBusy}
                  onClick={() => removeProfile(profile.key)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="grid">
          <div>
            <label>Profile Key</label>
            <input
              placeholder="e.g. marketing2"
              value={newProfileKey}
              onChange={(e) => setNewProfileKey(e.target.value)}
            />
          </div>
          <div>
            <label>SMTP Host</label>
            <input
              value={newProfileHost}
              onChange={(e) => setNewProfileHost(e.target.value)}
            />
          </div>
          <div>
            <label>Port</label>
            <input
              type="number"
              value={newProfilePort}
              onChange={(e) =>
                setNewProfilePort(Number(e.target.value || 587))
              }
            />
          </div>
          <div>
            <label>SMTP Username</label>
            <input
              value={newProfileUser}
              onChange={(e) => setNewProfileUser(e.target.value)}
            />
          </div>
          <div>
            <label>SMTP Password / App Password</label>
            <input
              type="password"
              value={newProfilePass}
              onChange={(e) => setNewProfilePass(e.target.value)}
            />
          </div>
          <div>
            <label>From (optional)</label>
            <input
              placeholder='ScholarX <you@example.com>'
              value={newProfileFrom}
              onChange={(e) => setNewProfileFrom(e.target.value)}
            />
          </div>
        </section>

        <div className="actions">
          <button disabled={profileBusy} onClick={addProfile}>
            Add Profile
          </button>
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

        <label style={{ marginTop: 12 }}>Send From</label>
        <select
          value={senderProfile}
          onChange={(e) => setSenderProfile(e.target.value as SenderProfile)}
        >
          {profileOptions.map((profile) => (
            <option key={profile.key} value={profile.key}>
              {profile.key} ({profile.from})
            </option>
          ))}
        </select>

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
          <button disabled={busy || !canResume} onClick={resumeSending}>
            Resume
          </button>
          <button disabled={busy} onClick={loadFailed}>
            Load Failed List
          </button>
        </div>
      </section>

      {status === "limit_reached" && (
        <section className="card" style={{ borderColor: "var(--danger)" }}>
          <p style={{ margin: 0 }}>
            Profile <strong>{limitProfile || senderProfile}</strong> hit its
            send limit. Pick a different profile above, then click{" "}
            <strong>Resume</strong> to keep going.
          </p>
        </section>
      )}

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
