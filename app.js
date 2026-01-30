const API_BASE_URL = "http://localhost:5000";
const TOKEN_KEY = "auth_token";

const pageHandlers = {
  register: handleRegister,
  login: handleLogin,
  dashboard: handleDashboard,
};

const activeForm = document.querySelector("[data-form]");
if (activeForm) {
  const type = activeForm.getAttribute("data-form");
  const handler = pageHandlers[type];
  if (handler) {
    handler(activeForm);
  }
} else if (document.querySelector("[data-dashboard]")) {
  handleDashboard();
}

function handleRegister(form) {
  const messageEl = document.querySelector("[data-message]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(messageEl, "");

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeJson(response);
      if (response.ok) {
        setMessage(messageEl, "Registration successful", "success");
        form.reset();
        return;
      }

      setMessage(
        messageEl,
        mapRegisterError(data?.message || "Email already exists"),
        "error"
      );
    } catch (error) {
      setMessage(messageEl, "Unable to register. Try again.", "error");
    }
  });
}

function handleLogin(form) {
  const messageEl = document.querySelector("[data-message]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(messageEl, "");

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeJson(response);
      if (response.ok && data?.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setMessage(messageEl, "Login successful", "success");
        window.location.href = "./dashboard.html";
        return;
      }

      setMessage(
        messageEl,
        mapLoginError(data?.message || "Invalid password"),
        "error"
      );
    } catch (error) {
      setMessage(messageEl, "Unable to login. Try again.", "error");
    }
  });
}

function handleDashboard() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.replace("./login.html");
    return;
  }

  const emailEl = document.querySelector("[data-email]");
  const greetingEl = document.querySelector("[data-greeting]");
  const progressEl = document.querySelector("[data-progress]");
  const progressTextEl = document.querySelector("[data-progress-text]");

  const email = extractEmailFromToken(token);
  if (emailEl) {
    emailEl.textContent = email || "user";
  }
  if (greetingEl) {
    greetingEl.classList.add("greeting-animate");
  }
  if (progressEl && progressTextEl) {
    const value = getDailyProgress();
    progressEl.style.width = `${value}%`;
    progressTextEl.textContent = `${value}%`;
  }

  const logoutButton = document.querySelector("[data-logout]");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace("./login.html");
    });
  }
}

function extractEmailFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return "";
  return payload.email || payload.user || payload.username || "";
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  try {
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function getDailyProgress() {
  const base = new Date().getDate() * 7;
  return 55 + (base % 40);
}

function setMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.className = "message";
  if (!text) return;
  if (type) {
    element.classList.add(type);
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function mapRegisterError(message) {
  const lower = String(message).toLowerCase();
  if (lower.includes("exists")) return "Email already exists";
  return "Unable to register. Try again.";
}

function mapLoginError(message) {
  const lower = String(message).toLowerCase();
  if (lower.includes("invalid") || lower.includes("password")) {
    return "Invalid password";
  }
  return "Unable to login. Try again.";
}
