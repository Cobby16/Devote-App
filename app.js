const BAD_WORDS = ["idiot", "stupid", "hate", "dumb"];

const state = {
  user: { id: "u-me", name: "You", blocked: new Set() },
  creatorsFollowed: new Set(),
  liked: new Set(),
  saved: new Set(),
  videos: [
    {
      id: "v1",
      creatorId: "u1",
      creator: "GraceDaily",
      title: "When anxiety hits, pray before you panic.",
      tags: ["Prayer", "Anxiety"],
      url: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      comments: [{ user: "HopeBuilder", text: "Needed this today 🙏" }],
      removed: false,
    },
    {
      id: "v2",
      creatorId: "u2",
      creator: "ScriptureMinute",
      title: "John 15:5 in 30 seconds — remain connected.",
      tags: ["Bible Study", "Testimony"],
      url: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
      comments: [],
      removed: false,
    },
  ],
  reports: [],
  suspendedUsers: new Set(),
  daily: {
    verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
    ref: "Philippians 4:6",
    prompt: "What do you need to surrender to God today?",
    streak: Number(localStorage.getItem("devote-streak") || 0),
    lastCheckin: localStorage.getItem("devote-last-checkin") || null,
  },
  currentCommentVideoId: null,
  currentReportTarget: null,
};

function el(id) {
  return document.getElementById(id);
}

function setTab(tabName) {
  document.querySelectorAll(".tab").forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });
  document.querySelectorAll(".bottom-nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
}

function incStreakIfNewDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.daily.lastCheckin !== today) {
    state.daily.streak += 1;
    state.daily.lastCheckin = today;
    localStorage.setItem("devote-streak", String(state.daily.streak));
    localStorage.setItem("devote-last-checkin", today);
  }
}

function renderFeed() {
  const feed = el("feed");
  feed.innerHTML = "";

  const visibleVideos = state.videos.filter(
    (video) => !video.removed && !state.user.blocked.has(video.creatorId) && !state.suspendedUsers.has(video.creatorId),
  );

  if (!visibleVideos.length) {
    feed.innerHTML = '<p class="alert">No videos available yet. Follow creators or check back later.</p>';
    return;
  }

  visibleVideos.forEach((video) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <video class="video" controls src="${video.url}"></video>
      <h3>${video.title}</h3>
      <p class="meta">@${video.creator}</p>
      <div>${video.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      <div class="actions">
        <button data-action="like" data-id="${video.id}" class="${state.liked.has(video.id) ? "active" : ""}">Like</button>
        <button data-action="save" data-id="${video.id}" class="${state.saved.has(video.id) ? "active" : ""}">Save</button>
        <button data-action="follow" data-id="${video.id}" class="${state.creatorsFollowed.has(video.creatorId) ? "active" : ""}">Follow</button>
        <button data-action="comment" data-id="${video.id}">Comment (${video.comments.length})</button>
        <button data-action="share" data-id="${video.id}">Share</button>
        <button data-action="report" data-id="${video.id}">Report</button>
        <button data-action="block" data-id="${video.id}">Block user</button>
      </div>`;
    feed.appendChild(card);
  });
}

function renderExplore() {
  const explore = el("explore");
  const tags = [...new Set(state.videos.flatMap((v) => v.tags))];
  const creators = [...new Set(state.videos.map((v) => v.creator))];
  explore.innerHTML = `
    <article class="card">
      <h2>Explore</h2>
      <input id="explore-search" placeholder="Search creators or tags" />
      <p class="small">Suggested tags</p>
      <div class="grid">${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      <p class="small">Featured creators</p>
      <div class="grid">${creators.map((c) => `<div class="card">@${c}</div>`).join("")}</div>
    </article>`;
}

function renderCreate() {
  el("create").innerHTML = `
    <article class="card">
      <h2>Post a short video</h2>
      <label>Video URL (mp4)</label>
      <input id="create-url" placeholder="https://...mp4" />
      <label>Title</label>
      <input id="create-title" maxlength="120" placeholder="What is this video about?" />
      <label>Tags (comma-separated)</label>
      <input id="create-tags" placeholder="Prayer, Anxiety" />
      <button id="create-submit" class="primary">Post</button>
      <p class="small">V1 uses link-based upload for speed. Direct upload comes in V2.</p>
    </article>`;
}

function renderDaily() {
  el("daily").innerHTML = `
    <article class="card">
      <h2>Daily Faith Habit</h2>
      <p class="streak">🔥 ${state.daily.streak} day streak</p>
      <h3>${state.daily.ref}</h3>
      <p>${state.daily.verse}</p>
      <p><strong>Reflect:</strong> ${state.daily.prompt}</p>
      <div class="actions">
        <button data-daily="Amen">Amen</button>
        <button data-daily="Needed this">Needed this</button>
        <button data-daily="Prayed">Prayed</button>
      </div>
      <label>Optional reflection (max 200 chars)</label>
      <textarea id="daily-reflection" maxlength="200"></textarea>
      <button id="daily-submit" class="primary">Complete daily check-in</button>
    </article>`;
}

function renderProfile() {
  const myVideos = state.videos.filter((v) => v.creatorId === state.user.id && !v.removed).length;
  el("profile").innerHTML = `
    <article class="card">
      <h2>${state.user.name}</h2>
      <p class="meta">Saved videos: ${state.saved.size} · Following creators: ${state.creatorsFollowed.size} · Your posts: ${myVideos}</p>
    </article>
    <article class="card">
      <h3>Admin moderation queue</h3>
      <p class="small">Reports submitted: ${state.reports.length}</p>
      ${
        state.reports.length
          ? state.reports
              .map(
                (r, idx) => `<div class="card"><strong>${r.reason}</strong><p class="small">Target: ${r.targetId}</p><button data-admin-remove="${r.targetId}">Remove content</button> <button data-admin-suspend="${r.creatorId}">Suspend creator</button> <button data-admin-clear="${idx}">Resolve</button></div>`,
              )
              .join("")
          : '<p class="small">No active reports 🎉</p>'
      }
    </article>`;
}

function renderAll() {
  renderFeed();
  renderExplore();
  renderCreate();
  renderDaily();
  renderProfile();
}

function setupEvents() {
  el("bottom-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-tab]");
    if (btn) setTab(btn.dataset.tab);
  });

  el("app").addEventListener("click", (event) => {
    const target = event.target;

    if (target.dataset.action) {
      const video = state.videos.find((v) => v.id === target.dataset.id);
      if (!video) return;

      switch (target.dataset.action) {
        case "like":
          state.liked.has(video.id) ? state.liked.delete(video.id) : state.liked.add(video.id);
          break;
        case "save":
          state.saved.has(video.id) ? state.saved.delete(video.id) : state.saved.add(video.id);
          break;
        case "follow":
          state.creatorsFollowed.has(video.creatorId)
            ? state.creatorsFollowed.delete(video.creatorId)
            : state.creatorsFollowed.add(video.creatorId);
          break;
        case "comment":
          state.currentCommentVideoId = video.id;
          el("comment-list").innerHTML =
            video.comments.map((c) => `<p><strong>${c.user}:</strong> ${c.text}</p>`).join("") || "<p>No comments yet.</p>";
          el("comment-dialog").showModal();
          break;
        case "share":
          navigator.clipboard.writeText(`https://devote.app/video/${video.id}`).catch(() => {});
          alert("Link copied for sharing.");
          break;
        case "report":
          state.currentReportTarget = { targetId: video.id, creatorId: video.creatorId };
          el("report-dialog").showModal();
          break;
        case "block":
          state.user.blocked.add(video.creatorId);
          break;
      }
      renderAll();
    }

    if (target.id === "create-submit") {
      const url = el("create-url").value.trim();
      const title = el("create-title").value.trim();
      const tags = el("create-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
      if (!url || !title) {
        alert("Please add a video URL and title.");
        return;
      }
      state.videos.unshift({
        id: `v${Date.now()}`,
        creatorId: state.user.id,
        creator: "You",
        title,
        tags: tags.length ? tags : ["General"],
        url,
        comments: [],
        removed: false,
      });
      renderAll();
      setTab("feed");
    }

    if (target.id === "daily-submit") {
      incStreakIfNewDay();
      alert("Daily check-in completed.");
      renderAll();
    }

    if (target.dataset.daily) {
      target.classList.toggle("active");
    }

    if (target.dataset.adminRemove) {
      const video = state.videos.find((v) => v.id === target.dataset.adminRemove);
      if (video) video.removed = true;
      renderAll();
    }

    if (target.dataset.adminSuspend) {
      state.suspendedUsers.add(target.dataset.adminSuspend);
      renderAll();
    }

    if (target.dataset.adminClear) {
      state.reports.splice(Number(target.dataset.adminClear), 1);
      renderAll();
    }
  });

  el("comment-submit").addEventListener("click", () => {
    const text = el("comment-input").value.trim();
    if (!text) return;
    if (BAD_WORDS.some((w) => text.toLowerCase().includes(w))) {
      alert("Comment blocked by basic filter.");
      return;
    }
    const video = state.videos.find((v) => v.id === state.currentCommentVideoId);
    if (video) video.comments.push({ user: state.user.name, text });
    el("comment-input").value = "";
    renderAll();
  });

  el("report-submit").addEventListener("click", () => {
    if (!state.currentReportTarget) return;
    state.reports.push({ ...state.currentReportTarget, reason: el("report-reason").value });
    renderAll();
  });
}

renderAll();
setupEvents();
