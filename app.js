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
    const age = Number(form.age.value);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, age }),
      });

      const data = await safeJson(response);
      if (response.ok) {
        setMessage(
          messageEl,
          data?.message || "Registration successful",
          "success"
        );
        form.reset();
        return;
      }

      setMessage(messageEl, data?.message || "Registration failed", "error");
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
        setMessage(messageEl, data?.message || "Login successful", "success");
        setTimeout(() => {
          window.location.href = "./dashboard.html";
        }, 400);
        return;
      }

      setMessage(messageEl, data?.message || "Login failed", "error");
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

  const emailEls = document.querySelectorAll("[data-email]");
  const ageEl = document.querySelector("[data-age]");
  const avatarEl = document.querySelector("[data-avatar]");
  const messageEl = document.querySelector("[data-message]");
  const greetingEl = document.querySelector("[data-greeting]");
  const progressEl = document.querySelector("[data-progress]");
  const progressTextEl = document.querySelector("[data-progress-text]");
  const lastUpdateEl = document.querySelector("[data-last-update]");
  const avatarInput = document.querySelector("[data-avatar-input]");
  const avatarButton = document.querySelector("[data-avatar-button]");
  const ageInput = document.getElementById("newAge");
  const updateAgeBtn = document.getElementById("updateAgeBtn");
  const ageFocusBtn = document.querySelector("[data-age-focus]");

  if (greetingEl) {
    greetingEl.classList.add("greeting-animate");
  }
  const cards = document.querySelectorAll(".lux-card");
  if (cards.length) {
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 80}ms`;
    });
  }
  if (progressEl && progressTextEl) {
    const value = getDailyProgress();
    progressEl.style.width = `${value}%`;
    progressTextEl.textContent = `${value}%`;
  }
  if (lastUpdateEl) {
    lastUpdateEl.textContent = new Date().toLocaleTimeString();
  }

  const logoutButton = document.querySelector("[data-logout]");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace("./login.html");
    });
  }

  if (avatarButton && avatarInput) {
    avatarButton.addEventListener("click", () => avatarInput.click());
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", async () => {
      if (!avatarInput.files || !avatarInput.files[0]) return;
      const file = avatarInput.files[0];
      const formData = new FormData();
      formData.append("avatar", file);

      setMessage(messageEl, "");
      setBusy(avatarButton, true);
      try {
        const response = await fetch(`${API_BASE_URL}/me/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await safeJson(response);
        if (response.ok) {
          setMessage(
            messageEl,
            data?.message || "Avatar updated",
            "success"
          );
          if (avatarEl) {
            const avatarUrl =
              data?.avatarUrl || localStorage.getItem("avatar_url");
            if (data?.avatarUrl) {
              localStorage.setItem("avatar_url", data.avatarUrl);
            }
            avatarEl.src = resolveAvatarUrl(avatarUrl) || URL.createObjectURL(file);
          }
          return;
        }
        setMessage(messageEl, data?.message || "Upload failed", "error");
      } catch (error) {
        setMessage(messageEl, "Unable to upload avatar.", "error");
      } finally {
        setBusy(avatarButton, false);
      }
    });
  }

  if (ageFocusBtn && ageInput) {
    ageFocusBtn.addEventListener("click", () => {
      ageInput.focus();
    });
  }

  if (updateAgeBtn && ageInput) {
    updateAgeBtn.addEventListener("click", async () => {
      const newAge = Number(ageInput.value);
      if (!newAge) {
        setMessage(messageEl, "Enter a valid age.", "error");
        return;
      }

      setMessage(messageEl, "");
      setBusy(updateAgeBtn, true);
      try {
        const { response, data } = await updateAge(token, newAge);
        if (response.ok) {
          if (ageEl) {
            ageEl.textContent = data?.age ?? String(newAge);
          }
          if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleTimeString();
          }
          setMessage(
            messageEl,
            data?.message || "Age updated successfully.",
            "success"
          );
          return;
        }

        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          window.location.replace("./login.html");
          return;
        }
        setMessage(messageEl, data?.message || "Failed to update age.", "error");
      } catch (error) {
        setMessage(messageEl, "Unable to update age.", "error");
      } finally {
        setBusy(updateAgeBtn, false);
      }
    });
  }

  loadUserProfile(token, {
    emailEls,
    ageEl,
    avatarEl,
    messageEl,
  });
}

async function loadUserProfile(token, elements) {
  const { emailEls, ageEl, avatarEl, messageEl } = elements;
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(response);
    if (!response.ok) {
      setMessage(messageEl, data?.message || "Failed to load profile", "error");
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.replace("./login.html");
      }
      return;
    }

    if (emailEls) {
      emailEls.forEach((el) => {
        el.textContent = data?.email || "user";
      });
    }
    if (ageEl) {
      ageEl.textContent = data?.age ?? "--";
    }
    if (avatarEl) {
      const storedAvatar = localStorage.getItem("avatar_url");
      const avatarUrl = data?.avatarUrl || storedAvatar;
      if (data?.avatarUrl) {
        localStorage.setItem("avatar_url", data.avatarUrl);
      }
      avatarEl.src = resolveAvatarUrl(avatarUrl) || avatarEl.src;
    }
  } catch (error) {
    setMessage(messageEl, "Unable to load profile.", "error");
  }
}

async function updateAge(token, age) {
  const payload = JSON.stringify({ age });
  const options = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  };

  let response = await fetch(`${API_BASE_URL}/me`, options);
  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/me/update`, options);
  }
  const data = await safeJson(response);
  return { response, data };
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

function setBusy(button, isBusy) {
  if (!button) return;
  button.disabled = isBusy;
  button.classList.toggle("is-loading", isBusy);
}

function resolveAvatarUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
