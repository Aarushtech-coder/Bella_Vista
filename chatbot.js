// chatbot.js - Advanced client-side conversational AI engine for Bella Vista

document.addEventListener("DOMContentLoaded", () => {
  // --- Guard against double-initialization ---
  // If this script ever gets included twice on the same page (a very common
  // copy-paste mistake), this prevents a second, competing chatbot instance
  // from attaching duplicate listeners and desyncing the booking state.
  if (window.__bellaVistaChatInitialized) {
    console.warn(
      "Bella Vista chatbot already initialized — skipping duplicate init.",
    );
    return;
  }
  window.__bellaVistaChatInitialized = true;

  // --- DOM Elements ---
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const chatSendBtn = document.getElementById("chat-send-btn");
  const chatMicBtn = document.getElementById("chat-mic-btn");
  const charCounter = document.getElementById("char-counter");
  const suggestionsContainer = document.getElementById("chat-suggestions");
  const clearChatBtn = document.getElementById("clear-chat");
  const volumeToggleBtn = document.getElementById("volume-toggle");

  // Fail loudly (but gracefully) instead of throwing an unhelpful
  // "Cannot read properties of null" that silently kills every listener below.
  const requiredEls = {
    chatMessages,
    chatInput,
    chatSendBtn,
    chatMicBtn,
    charCounter,
    suggestionsContainer,
  };
  for (const [name, el] of Object.entries(requiredEls)) {
    if (!el) {
      console.error(
        `Bella Vista chatbot: required element #${name} not found in the page. Chatbot cannot start.`,
      );
      return;
    }
  }

  // --- State Variables ---
  let isSoundEnabled = true;
  let isListening = false;
  let recognition = null;

  // True while we're waiting on a simulated "typing" reply.
  // Prevents the user from firing overlapping messages, which previously
  // could resolve out of order and make the bot look like it had stopped responding.
  let isBotBusy = false;

  // Booking State Machine
  const BOOKING_STATES = {
    NONE: "none",
    PARTY_SIZE: "party_size",
    DATE: "date",
    TIME: "time",
    NAME: "name",
    EMAIL: "email",
  };

  let currentBookingState = BOOKING_STATES.NONE;
  let bookingData = {
    guests: "",
    date: "",
    time: "",
    name: "",
    email: "",
  };

  // --- Menu Database ---
  const MENU_DATABASE = [
    {
      id: "bruschetta",
      name: "Bruschetta Italiana",
      category: "Appetizer",
      price: "$14",
      desc: "Fresh heirloom tomatoes, basil, mozzarella fior di latte on toasted sourdough, drizzled with aged balsamic.",
      tags: ["Vegetarian"],
      img: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400",
      link: "menu.html#item-bruschetta",
    },
    {
      id: "antipasto",
      name: "Antipasto Platter",
      category: "Appetizer",
      price: "$22",
      desc: "Selection of prosciutto di Parma, salami Milano, aged Pecorino, olives, and marinated artichokes.",
      tags: ["Chef Special"],
      img: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400",
      link: "menu.html#item-antipasto",
    },
    {
      id: "calamari",
      name: "Calamari Fritti",
      category: "Appetizer",
      price: "$18",
      desc: "Crispy golden fried squid rings with house-made marinara and lemon aioli dipping sauces.",
      tags: ["Seafood"],
      img: "https://images.unsplash.com/photo-1612871689548-dd3f4518d6bf?w=400",
      link: "menu.html#item-calamari",
    },
    {
      id: "carbonara",
      name: "Spaghetti Carbonara",
      category: "Pasta",
      price: "$28",
      desc: "Traditional Roman recipe — guanciale, free-range egg yolk, Pecorino Romano, freshly cracked black pepper.",
      tags: ["Chef Special"],
      img: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400",
      link: "menu.html#item-carbonara",
    },
    {
      id: "bolognese",
      name: "Tagliatelle Bolognese",
      category: "Pasta",
      price: "$26",
      desc: "Slow-cooked beef and pork ragù, simmered for 6 hours, hand-rolled tagliatelle, Parmigiano Reggiano.",
      tags: [],
      img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400",
      link: "menu.html#item-bolognese",
    },
    {
      id: "cacio",
      name: "Cacio e Pepe",
      category: "Pasta",
      price: "$24",
      desc: "Rome's most iconic pasta — Tonnarelli pasta, Pecorino Romano DOP, Parmigiano Reggiano, black pepper emulsion.",
      tags: ["Vegetarian"],
      img: "https://images.unsplash.com/photo-1519997943163-2b42e4be1673?w=400",
      link: "menu.html#item-cacio",
    },
    {
      id: "pesto",
      name: "Trofie al Pesto Genovese",
      category: "Pasta",
      price: "$23",
      desc: "Handmade trofie pasta with fresh basil pesto, pine nuts, Ligurian extra-virgin olive oil, and Parmigiano.",
      tags: ["Vegetarian"],
      img: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400",
      link: "menu.html#item-pesto",
    },
    {
      id: "margherita",
      name: "Margherita al Forno",
      category: "Pizza",
      price: "$24",
      desc: "San Marzano DOP tomato sauce, buffalo mozzarella, fresh basil leaves, extra virgin olive oil. Wood-fired.",
      tags: ["Vegetarian", "Chef Special"],
      img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400",
      link: "menu.html#item-margherita",
    },
    {
      id: "diavola",
      name: "Pizza Diavola",
      category: "Pizza",
      price: "$27",
      desc: "Spicy Calabrian nduja sausage, smoked mozzarella, roasted peppers, Sicilian oregano, fresh chilli.",
      tags: ["Spicy"],
      img: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400",
      link: "menu.html#item-diavola",
    },
    {
      id: "tartufata",
      name: "Pizza Tartufata",
      category: "Pizza",
      price: "$34",
      desc: "White base, black truffle cream, mushroom medley, Tallegio, shaved black truffle, fresh thyme.",
      tags: ["Vegetarian", "Chef Special"],
      img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
      link: "menu.html#item-tartufata",
    },
    {
      id: "branzino",
      name: "Branzino alla Griglia",
      category: "Main Course",
      price: "$42",
      desc: "Whole grilled Mediterranean sea bass, lemon-caper butter, caponata, roasted cherry tomatoes.",
      tags: ["Seafood"],
      img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
      link: "menu.html#item-branzino",
    },
    {
      id: "ossobuco",
      name: "Ossobuco alla Milanese",
      category: "Main Course",
      price: "$48",
      desc: "Braised veal shank in white wine and gremolata, served with classic saffron risotto Milanese.",
      tags: ["Chef Special"],
      img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
      link: "menu.html#item-ossobuco",
    },
    {
      id: "tiramisu",
      name: "Classic Tiramisù",
      category: "Dessert",
      price: "$14",
      desc: "Mascarpone cream, espresso-soaked savoiardi biscuits, Amaretto, dusted with finest cocoa. Our heritage recipe.",
      tags: ["Chef Special"],
      img: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
      link: "menu.html#item-tiramisu",
    },
    {
      id: "pannacotta",
      name: "Panna Cotta al Lampone",
      category: "Dessert",
      price: "$12",
      desc: "Silky vanilla panna cotta, fresh raspberry coulis, crushed pistachio, edible flowers.",
      tags: ["Vegetarian"],
      img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
      link: "menu.html#item-pannacotta",
    },
    {
      id: "negroni",
      name: "Classic Negroni",
      category: "Cocktail",
      price: "$16",
      desc: "Gin, Campari, sweet vermouth, orange peel. Italy's most beloved aperitivo since 1919.",
      tags: [],
      img: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400",
      link: "menu.html#item-negroni",
    },
    {
      id: "aperol",
      name: "Aperol Spritz",
      category: "Cocktail",
      price: "$14",
      desc: "Aperol, Prosecco DOC, sparkling water, fresh orange slice. The quintessential Italian aperitivo.",
      tags: [],
      img: "https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400",
      link: "menu.html#item-aperol",
    },
    {
      id: "barolo",
      name: "Barolo DOCG 2018",
      category: "Wine",
      price: "$22",
      desc: "The 'King of Italian Wines' — Nebbiolo from Piedmont. Full-bodied, complex, pairs with red meats.",
      tags: ["Chef Special"],
      img: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400",
      link: "menu.html#item-barolo",
    },
  ];

  // --- Sound Effects System ---
  // FIX: reuse a single AudioContext instead of creating a brand-new one on
  // every single message. Browsers (especially Safari/iOS) hard-cap the
  // number of *unclosed* AudioContexts; previously every chime, send and
  // receive sound leaked a new context, so longer conversations could start
  // silently failing or stalling on audio creation the more messages were exchanged.
  let sharedAudioCtx = null;
  const getAudioCtx = () => {
    if (!sharedAudioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  };

  const playSound = (type) => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = getAudioCtx();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "send") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(
          880,
          audioCtx.currentTime + 0.1,
        );
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.12,
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === "receive") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(
          550,
          audioCtx.currentTime + 0.15,
        );
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.2,
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === "chime") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.45,
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      }
      // Tidy up oscillator nodes once they're done playing.
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          /* already disconnected */
        }
      };
    } catch (e) {
      console.warn("Audio context not supported yet or gesture blocked.", e);
    }
  };

  // --- Voice Input (Web Speech API) ---
  const setupSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        chatMicBtn.classList.add("active-mic");
        chatInput.placeholder = "Listening...";
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error", e);
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        updateCharCounter();
        if (!isBotBusy) {
          playSound("send");
          handleUserMessage(transcript);
          chatInput.value = "";
          updateCharCounter();
        }
      };
    } else {
      chatMicBtn.title = "Speech recognition not supported in this browser";
    }
  };

  const stopListening = () => {
    isListening = false;
    chatMicBtn.classList.remove("active-mic");
    chatInput.placeholder = "Ask me about menu, reservations, hours...";
    if (recognition) recognition.stop();
  };

  chatMicBtn.addEventListener("click", () => {
    if (!recognition) {
      // Simulate listening if Speech Recognition is not supported
      chatMicBtn.classList.add("active-mic");
      chatInput.placeholder = "Listening (Simulated)...";
      setTimeout(() => {
        chatMicBtn.classList.remove("active-mic");
        chatInput.placeholder = "Ask me about menu, reservations, hours...";
        const simulatedPrompts = [
          "Recommend chef specials",
          "Book a table for 4",
          "Are you open on Sundays?",
          "Show me vegetarian dishes",
        ];
        const randomPrompt =
          simulatedPrompts[Math.floor(Math.random() * simulatedPrompts.length)];
        chatInput.value = randomPrompt;
        updateCharCounter();
      }, 2000);
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  });

  // --- UI Helpers ---
  const updateCharCounter = () => {
    const len = chatInput.value.length;
    charCounter.textContent = `${len}/200`;
  };

  chatInput.addEventListener("input", () => {
    if (chatInput.value.length > 200) {
      chatInput.value = chatInput.value.substring(0, 200);
    }
    updateCharCounter();
  });

  const getItalianGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Buongiorno! (Good morning)";
    if (hours < 17) return "Buon pomeriggio! (Good afternoon)";
    return "Buona sera! (Good evening)";
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const scrollChatToBottom = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Add Message to Feed
  const appendMessage = (sender, content, isHTML = false) => {
    const msgElement = document.createElement("div");
    msgElement.className = `message ${sender}`;

    const avatar = sender === "bot" ? "🍷" : "👤";

    msgElement.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-bubble">${isHTML ? content : escapeHTML(content)}</div>
        <span class="msg-time">${formatTime()}</span>
      </div>
    `;

    chatMessages.appendChild(msgElement);
    scrollChatToBottom();
  };

  // Escape HTML helper
  const escapeHTML = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  // Show/Hide Typing Indicator
  let typingIndicatorElement = null;
  const showTypingIndicator = () => {
    if (typingIndicatorElement) return;

    typingIndicatorElement = document.createElement("div");
    typingIndicatorElement.className = "message bot";
    typingIndicatorElement.innerHTML = `
      <div class="msg-avatar">🍷</div>
      <div class="msg-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    chatMessages.appendChild(typingIndicatorElement);
    scrollChatToBottom();
  };

  const removeTypingIndicator = () => {
    if (typingIndicatorElement) {
      typingIndicatorElement.remove();
      typingIndicatorElement = null;
    }
  };

  // FIX: lock/unlock input while the bot is "typing" a reply, so a fast
  // user can't fire a second message before the first one resolves. This is
  // what previously caused replies to occasionally resolve out of order and
  // make the chat look like it had silently stopped responding.
  const setBotBusy = (busy) => {
    isBotBusy = busy;
    chatSendBtn.disabled = busy;
    chatInput.disabled = busy;
    chatSendBtn.classList.toggle("is-busy", busy);
  };

  // Render Suggestion Chips
  const renderSuggestionChips = (chipsList) => {
    suggestionsContainer.innerHTML = "";
    chipsList.forEach((chip) => {
      const btn = document.createElement("button");
      btn.className = "suggestion-chip";
      btn.innerHTML = chip;
      btn.addEventListener("click", () => {
        if (isBotBusy) return;
        playSound("send");
        // Strip emojis for clean processing
        const cleanText = chip
          .replace(
            /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
            "",
          )
          .trim();
        appendMessage("user", chip);
        processInput(cleanText);
      });
      suggestionsContainer.appendChild(btn);
    });
  };

  // Standard Suggestions
  const defaultSuggestions = [
    "Book a Table 📅",
    "Chef's Specials ⭐",
    "Vegetarian Options 🌿",
    "Opening Hours 🕒",
    "Valet & Parking 🚗",
    "Wine Recommendations 🍷",
  ];

  // --- Chat Bot Core Processing ---
  const handleUserMessage = (text) => {
    if (!text.trim()) return;
    appendMessage("user", text);
    processInput(text);
  };

  const processInput = (userInput) => {
    setBotBusy(true);
    showTypingIndicator();

    // Simulate AI thinking delay
    const delay = Math.max(600, Math.min(1500, userInput.length * 15));

    setTimeout(() => {
      removeTypingIndicator();

      let reply;
      try {
        reply = generateBotResponse(userInput);
      } catch (err) {
        // FIX: if anything in response-generation throws, surface a graceful
        // fallback instead of silently dying and leaving the user with no reply.
        console.error("Bella Vista chatbot: error generating response", err);
        reply = {
          text: `Mi scusi! Something went wrong on my end. Could you try rephrasing that?`,
          isHTML: false,
          suggestions: defaultSuggestions,
        };
        currentBookingState = BOOKING_STATES.NONE;
      }

      playSound("receive");
      appendMessage("bot", reply.text, reply.isHTML);

      // Update suggestions
      if (reply.suggestions && reply.suggestions.length) {
        renderSuggestionChips(reply.suggestions);
      } else if (!reply.suggestions) {
        renderSuggestionChips(defaultSuggestions);
      } else {
        // Empty array on purpose (e.g. during name/email collection) — clear chips.
        suggestionsContainer.innerHTML = "";
      }

      setBotBusy(false);
      chatInput.focus();
    }, delay);
  };

  // Generator logic
  const generateBotResponse = (input) => {
    const query = input.toLowerCase().trim();

    // Check state of booking first
    if (currentBookingState !== BOOKING_STATES.NONE) {
      return handleBookingFlow(query, input);
    }

    // Direct Triggers for Booking
    if (query.match(/\b(book|reserve|reservation|booking|table|seat)\b/)) {
      currentBookingState = BOOKING_STATES.PARTY_SIZE;
      return {
        text: `Mamma Mia! I would love to help you book a table at Bella Vista. Let's make it quick and easy.\n\nFirst, **how many guests** will be joining us?`,
        isHTML: false,
        suggestions: [
          "1 Guest 👤",
          "2 Guests 👥",
          "4 Guests 🍷",
          "6 Guests 🍽️",
          "Large Group (7-10)",
          "Private Event (10+)",
        ],
      };
    }

    // Direct Triggers for Specials
    if (
      query.includes("special") ||
      query.includes("recommend") ||
      query.includes("signature") ||
      query.includes("best")
    ) {
      return {
        text: `Here are our exquisite **Chef's Specials** recommended by Chef Marco Bellini today. Every single one is crafted with the finest ingredients:`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "Show Pastas 🍝", "Show Desserts 🍰"],
      };
    }

    // Trigger Menu search
    if (
      query.includes("menu") ||
      query.includes("food") ||
      query.includes("eat") ||
      query.includes("dish") ||
      query.includes("pizza") ||
      query.includes("pasta") ||
      query.includes("dessert") ||
      query.includes("drink") ||
      query.includes("wine")
    ) {
      return handleMenuQuery(query);
    }

    // Diet filters
    if (
      query.includes("vegetarian") ||
      query.includes("vegan") ||
      query.includes("vegetable") ||
      query.includes("herb")
    ) {
      return handleFilterQuery(
        "Vegetarian",
        "Here are our delicious **Vegetarian** options:",
      );
    }
    if (
      query.includes("seafood") ||
      query.includes("fish") ||
      query.includes("squid") ||
      query.includes("sea bass")
    ) {
      return handleFilterQuery(
        "Seafood",
        "Here are our freshly caught **Seafood** selection:",
      );
    }
    if (
      query.includes("spicy") ||
      query.includes("hot") ||
      query.includes("pepper") ||
      query.includes("diavola")
    ) {
      return handleFilterQuery(
        "Spicy",
        "Looking for some heat? 🌶️ Here is our spicy selection:",
      );
    }
    if (query.includes("gluten") || query.includes("coeliac")) {
      return {
        text: `We care about your dietary needs! While many of our pizzas and pastas contain wheat, we offer **gluten-free penne pasta** replacements for any of our pasta dishes. Just ask your server!\n\nOur **Ossobuco alla Milanese** and **Branzino alla Griglia** are also naturally gluten-free friendly.`,
        isHTML: false,
        suggestions: [
          "Ossobuco Milanese 🍖",
          "Branzino Fish 🐟",
          "Pasta Options 🍝",
        ],
      };
    }

    // FAQs
    if (
      query.includes("hour") ||
      query.includes("time") ||
      query.includes("open") ||
      query.includes("close") ||
      query.includes("sunday")
    ) {
      return {
        text: `We are open during the following hours:\n\n• **Monday – Thursday**: 5:00 PM – 10:00 PM\n• **Friday – Saturday**: 5:00 PM – 11:30 PM\n• **Sunday**: 4:00 PM – 9:00 PM\n\n*Please note: Our last seating is 90 minutes before closing time.*`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "Menu Options 📋"],
      };
    }

    if (
      query.includes("location") ||
      query.includes("address") ||
      query.includes("where") ||
      query.includes("find") ||
      query.includes("map") ||
      query.includes("street")
    ) {
      return {
        text: `Bella Vista is nestled in the heart of New York City!\n\n📍 **69 Italian Street, City Center, New York, NY 10001**.\n\nNeed directions? [Click here to view on Google Maps](https://maps.google.com/?q=New+York+NY) or let me help you book a table.`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "Valet Parking 🚗", "Call Us 📞"],
      };
    }

    if (
      query.includes("park") ||
      query.includes("valet") ||
      query.includes("car") ||
      query.includes("garage")
    ) {
      return {
        text: `Yes, we offer **complimentary valet parking** for all our dining guests in our secure, private lot adjacent to the restaurant. Just pull up in front of our main entrance, and our team will gladly assist you!`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "Get Directions 🗺️"],
      };
    }

    if (
      query.includes("dress") ||
      query.includes("wear") ||
      query.includes("code") ||
      query.includes("casual")
    ) {
      return {
        text: `Our dress code is **Smart Casual**. We want you to feel both relaxed and elegantly dressed for a wonderful Italian culinary journey! (Collar shirts or smart casual attire are recommended; athletic wear is discouraged).`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "See Gallery 📷"],
      };
    }

    if (
      query.includes("delivery") ||
      query.includes("takeout") ||
      query.includes("takeaway") ||
      query.includes("order") ||
      query.includes("pickup")
    ) {
      return {
        text: `We offer premium delivery and pickup! You can place orders directly by calling our team at **+1 (696) 969-6969**. Delivery is free within a 3-mile radius for orders over $50.`,
        isHTML: false,
        suggestions: ["View Menu 🍕", "Call Restaurant 📞"],
      };
    }

    if (
      query.includes("phone") ||
      query.includes("number") ||
      query.includes("call") ||
      query.includes("contact") ||
      query.includes("email")
    ) {
      return {
        text: `You can reach the Bella Vista team directly:\n\n• 📞 Phone: **+1 (696) 969-6969**\n• ✉️ Email: **info@bellavista.com**\n\nFor large group reservations or private events, we recommend giving us a call!`,
        isHTML: false,
        suggestions: ["Book a Table 📅", "Opening Hours 🕒"],
      };
    }

    if (
      query.includes("chef") ||
      query.includes("owner") ||
      query.includes("founder") ||
      query.includes("marco") ||
      query.includes("bellini") ||
      query.includes("story")
    ) {
      return {
        text: `Bella Vista was founded in 2008 by **Chef Marco Bellini**. Born in Florence, Italy, Marco brought over 30 years of culinary mastery to NYC. His philosophy is simple: use authentic, imported Italian ingredients, cook with pure passion, and treat every guest like family.`,
        isHTML: false,
        suggestions: ["About Us Story 📜", "Chef's Specials ⭐"],
      };
    }

    if (query.match(/\b(hi|hello|hey|greetings|ciao|hola|bonjour)\b/)) {
      return {
        text: `${getItalianGreeting()}! I am **Bella**, your virtual Italian assistant. I can guide you through booking a table, recommend the perfect wine or pasta, or tell you more about our kitchen. How may I serve you today?`,
        isHTML: false,
        suggestions: [
          "Book a Table 📅",
          "Explore Menu 🍕",
          "Chef's Specials ⭐",
        ],
      };
    }

    if (query.match(/\b(thanks|thank you|awesome|great|perfect|grazie)\b/)) {
      return {
        text: `Prego! (You're welcome!) It is my absolute pleasure. Let me know if you need anything else, signore/signora. *Buon appetito!*`,
        isHTML: false,
        suggestions: ["Explore Menu 🍕", "Book a Table 📅"],
      };
    }

    // Fallback response
    return {
      text: `Mamma Mia! I didn't quite catch that. Could you clarify your question? You can ask me about our menu, reservations, opening hours, or location. Alternatively, click one of the suggestions below!`,
      isHTML: false,
      suggestions: [
        "Book a Table 📅",
        "Explore Menu 🍕",
        "Our Location 📍",
        "Call Us 📞",
      ],
    };
  };

  // --- Stateful Booking Flow Handler ---
  const handleBookingFlow = (query, rawInput) => {
    switch (currentBookingState) {
      case BOOKING_STATES.PARTY_SIZE: {
        // Parse party size
        let size = rawInput.replace(/\D/g, "");
        if (!size && query.includes("large")) size = "7-10";
        if (!size && query.includes("private")) size = "10+";
        if (!size) size = rawInput; // Fallback to raw text

        bookingData.guests = size;
        currentBookingState = BOOKING_STATES.DATE;
        return {
          text: `Perfetto! A table for **${size}** guests. \n\nFor **which date** would you like to make the reservation? (e.g., Today, Tomorrow, or type a date like 'July 4th')`,
          isHTML: false,
          suggestions: [
            "Today 📅",
            "Tomorrow ☀️",
            "This Friday 🍷",
            "This Saturday 🎉",
          ],
        };
      }

      case BOOKING_STATES.DATE:
        bookingData.date = rawInput;
        currentBookingState = BOOKING_STATES.TIME;
        return {
          text: `Benissimo! For **${rawInput}**. \n\nWhat **time** would you prefer? We serve dinner from 5:00 PM to 10:00 PM (11:30 PM on Fri/Sat).`,
          isHTML: false,
          suggestions: ["5:30 PM", "6:30 PM", "7:00 PM", "8:00 PM", "9:00 PM"],
        };

      case BOOKING_STATES.TIME:
        bookingData.time = rawInput;
        currentBookingState = BOOKING_STATES.NAME;
        return {
          text: `Excellent choice. A table for **${bookingData.guests}** guests on **${bookingData.date}** at **${rawInput}**.\n\nCould I please have your **first and last name**?`,
          isHTML: false,
          suggestions: [],
        };

      case BOOKING_STATES.NAME:
        bookingData.name = rawInput;
        currentBookingState = BOOKING_STATES.EMAIL;
        return {
          text: `Grazie, **${rawInput}**. Finally, what is your **email address** so we can send the confirmation details?`,
          isHTML: false,
          suggestions: [],
        };

      case BOOKING_STATES.EMAIL: {
        // Basic email check
        if (!rawInput.includes("@") || !rawInput.includes(".")) {
          return {
            text: `Oops, that doesn't look like a valid email. Please enter a valid email address so I can confirm your booking:`,
            isHTML: false,
            suggestions: [],
          };
        }
        bookingData.email = rawInput;
        currentBookingState = BOOKING_STATES.NONE; // Reset state

        // Save to LocalStorage
        const bookingId = "BV-" + Math.floor(10000 + Math.random() * 90000);
        const newReservation = {
          id: bookingId,
          fname: bookingData.name.split(" ")[0] || bookingData.name,
          lname: bookingData.name.split(" ").slice(1).join(" ") || "Guest",
          email: bookingData.email,
          phone: "+1 (555) 000-0000", // placeholder
          date: bookingData.date,
          time: bookingData.time,
          guests: bookingData.guests,
          occasion: "AI Chatbot Booking",
          created: new Date().toISOString(),
        };

        // Retrieve and append to existing reservations
        try {
          const existing = JSON.parse(
            localStorage.getItem("bellavista_reservations") || "[]",
          );
          existing.push(newReservation);
          localStorage.setItem(
            "bellavista_reservations",
            JSON.stringify(existing),
          );
        } catch (storageErr) {
          console.warn(
            "Could not persist reservation to localStorage",
            storageErr,
          );
        }

        // Generate Ticket HTML
        playSound("chime");
        const ticketHTML = `
          <div style="margin-bottom: 12px;">Your table is officially reserved! Here is your luxury dining ticket. A copy has been sent to your email.</div>
          <div class="res-ticket">
            <div class="ticket-header">
              <h4>BELLA VISTA</h4>
              <p>CONFIRMED RESERVATION</p>
            </div>
            <div class="ticket-body">
              <div class="ticket-row">
                <span>Guest:</span>
                <span>${newReservation.fname} ${newReservation.lname}</span>
              </div>
              <div class="ticket-row">
                <span>Party Size:</span>
                <span>${newReservation.guests} guests</span>
              </div>
              <div class="ticket-row">
                <span>Date:</span>
                <span>${newReservation.date}</span>
              </div>
              <div class="ticket-row">
                <span>Time:</span>
                <span>${newReservation.time}</span>
              </div>
              <div class="ticket-row">
                <span>Email:</span>
                <span>${newReservation.email}</span>
              </div>
            </div>
            <div class="ticket-footer">
              <div class="ticket-barcode"></div>
              <div class="ticket-id">BOOKING ID: ${newReservation.id}</div>
            </div>
          </div>
          <div style="margin-top: 14px; font-style: italic; color: var(--brand-dark); font-weight: 600;">Ci vediamo presto! We look forward to hosting you.</div>
        `;

        return {
          text: ticketHTML,
          isHTML: true,
          suggestions: [
            "Book Another Table 📅",
            "Explore Menu 🍕",
            "Valet Parking 🚗",
          ],
        };
      }

      // FIX: defensive default — if currentBookingState is ever an
      // unexpected value, gracefully reset instead of returning `undefined`
      // (which used to throw inside appendMessage and silently kill that turn).
      default:
        currentBookingState = BOOKING_STATES.NONE;
        return {
          text: `Sorry, I lost track of our booking — let's start fresh. Just say "book a table" whenever you're ready!`,
          isHTML: false,
          suggestions: defaultSuggestions,
        };
    }
  };

  // --- Menu Query Filter ---
  const handleMenuQuery = (query) => {
    let filtered = [];
    let heading = "Here is our menu selection:";

    if (query.includes("pizza")) {
      filtered = MENU_DATABASE.filter((item) => item.category === "Pizza");
      heading = "Here are our artisan **Wood-Fired Pizzas**:";
    } else if (
      query.includes("pasta") ||
      query.includes("spaghetti") ||
      query.includes("carbonara") ||
      query.includes("noodle")
    ) {
      filtered = MENU_DATABASE.filter((item) => item.category === "Pasta");
      heading = "Here is our authentic, fresh **Handmade Pasta** selection:";
    } else if (
      query.includes("dessert") ||
      query.includes("sweet") ||
      query.includes("tiramisu") ||
      query.includes("cake")
    ) {
      filtered = MENU_DATABASE.filter((item) => item.category === "Dessert");
      heading = "Indulge in our exquisite **Italian Desserts**:";
    } else if (
      query.includes("drink") ||
      query.includes("wine") ||
      query.includes("negroni") ||
      query.includes("cocktail") ||
      query.includes("spritz")
    ) {
      filtered = MENU_DATABASE.filter((item) =>
        ["Cocktail", "Wine"].includes(item.category),
      );
      heading = "Explore our premium **Wine and Cocktail selection**:";
    } else if (
      query.includes("appetizer") ||
      query.includes("start") ||
      query.includes("bruschetta") ||
      query.includes("platter")
    ) {
      filtered = MENU_DATABASE.filter((item) => item.category === "Appetizer");
      heading = "Start your meal with our delightful **Appetizers**:";
    } else {
      // General match
      filtered = MENU_DATABASE.slice(0, 3);
      heading = "Here are some of our **Signature Dishes**:";
    }

    if (filtered.length === 0) {
      return {
        text: `I couldn't find any dishes matching that specific description on our menu. Please try asking for pizza, pasta, dessert, or wine.`,
        isHTML: false,
        suggestions: ["Show Pizza 🍕", "Show Pasta 🍝", "Show Wine 🍷"],
      };
    }

    // Build Cards HTML
    let cardsHTML = `<div style="margin-bottom: 10px;">${heading}</div>`;
    cardsHTML += `<div class="chat-card-grid">`;

    filtered.forEach((item) => {
      const tagsHTML = item.tags
        .map(
          (t) =>
            `<span class="tag ${t === "Vegetarian" ? "vegetarian" : t === "Chef Special" ? "chef-special" : ""}">${t}</span>`,
        )
        .join("");

      cardsHTML += `
        <div class="chat-rich-card">
          <div class="chat-card-img" style="background-image: url('${item.img}')"></div>
          <div class="chat-card-body">
            <div class="chat-card-header">
              <span class="chat-card-cat">${item.category}</span>
              <span class="chat-card-price">${item.price}</span>
            </div>
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
            <div class="chat-card-tags">${tagsHTML}</div>
            <a href="${item.link}" class="btn btn-primary chat-card-btn">View Full Details</a>
          </div>
        </div>
      `;
    });

    cardsHTML += `</div>`;

    return {
      text: cardsHTML,
      isHTML: true,
      suggestions: ["Book a Table 📅", "Explore Wine 🍷", "Show Desserts 🍰"],
    };
  };

  // --- Tag Filter Helper ---
  const handleFilterQuery = (tag, message) => {
    const filtered = MENU_DATABASE.filter(
      (item) =>
        item.tags.includes(tag) ||
        (tag === "Spicy" &&
          item.category === "Pizza" &&
          item.id === "diavola") ||
        (tag === "Seafood" &&
          item.category === "Appetizer" &&
          item.id === "calamari"),
    );

    let cardsHTML = `<div style="margin-bottom: 10px;">${message}</div>`;
    cardsHTML += `<div class="chat-card-grid">`;

    filtered.forEach((item) => {
      const tagsHTML = item.tags
        .map(
          (t) =>
            `<span class="tag ${t === "Vegetarian" ? "vegetarian" : t === "Chef Special" ? "chef-special" : ""}">${t}</span>`,
        )
        .join("");

      cardsHTML += `
        <div class="chat-rich-card">
          <div class="chat-card-img" style="background-image: url('${item.img}')"></div>
          <div class="chat-card-body">
            <div class="chat-card-header">
              <span class="chat-card-cat">${item.category}</span>
              <span class="chat-card-price">${item.price}</span>
            </div>
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
            <div class="chat-card-tags">${tagsHTML}</div>
            <a href="${item.link}" class="btn btn-primary chat-card-btn">View Full Details</a>
          </div>
        </div>
      `;
    });

    cardsHTML += `</div>`;

    return {
      text: cardsHTML,
      isHTML: true,
      suggestions: [
        "Book a Table 📅",
        "Vegetarian Options 🌿",
        "Show Pizzas 🍕",
      ],
    };
  };

  // --- Event Listeners for Controls ---

  // Clear Chat Trigger
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
      chatMessages.innerHTML = "";
      currentBookingState = BOOKING_STATES.NONE;
      setBotBusy(false);
      removeTypingIndicator();
      appendMessage(
        "bot",
        `Chat session reset. Benvenuto! How may I assist you with your dining experience today?`,
      );
      renderSuggestionChips(defaultSuggestions);
    });
  }

  // Volume/Sound Toggle
  if (volumeToggleBtn) {
    volumeToggleBtn.addEventListener("click", () => {
      isSoundEnabled = !isSoundEnabled;
      volumeToggleBtn.innerHTML = isSoundEnabled ? "🔊" : "🔇";
      volumeToggleBtn.title = isSoundEnabled ? "Mute chimes" : "Enable chimes";
    });
  }

  // Input Send Events
  chatSendBtn.addEventListener("click", () => {
    if (isBotBusy) return; // FIX: ignore clicks while a reply is in flight
    const text = chatInput.value.trim();
    if (text) {
      playSound("send");
      handleUserMessage(text);
      chatInput.value = "";
      updateCharCounter();
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isBotBusy) chatSendBtn.click();
    }
  });

  // --- Initial Welcome Sequence ---
  setTimeout(() => {
    playSound("receive");
    appendMessage(
      "bot",
      `Benvenuto! ${getItalianGreeting()}.\n\nI am **Bella**, your virtual assistant for Bella Vista. I can assist you in booking a table, finding the perfect wine pairing, recommending our hand-rolled pastas, or checking valet details.\n\nHow can I help you have an unforgettable culinary experience today?`,
    );
    renderSuggestionChips(defaultSuggestions);
    setupSpeechRecognition();
  }, 300);
});
