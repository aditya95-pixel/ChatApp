const LINE_PATTERNS = [
  {
    regex: /^\[(\d{1,2}:\d{2}),\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s*([^:]+):\s*(.*)$/,
    groups: ["time", "date", "sender", "text"],
  },
  {
    regex: /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\s*[-–]\s*([^:]+):\s*(.*)$/,
    groups: ["date", "time", "sender", "text"],
  },
  {
    regex: /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]\s*([^:]+):\s*(.*)$/,
    groups: ["date", "time", "sender", "text"],
  },
  {
    regex: /^([A-Za-z0-9_ .]{2,30}):\s+(.*)$/,
    groups: ["sender", "text"],
  },
];

function matchLine(line) {
  for (const pattern of LINE_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const result = {};
      pattern.groups.forEach((key, i) => {
        result[key] = match[i + 1];
      });
      return result;
    }
  }
  return null;
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

export function parseChatLog(rawText, { myName, friendName }) {
  const lines = rawText.split(/\r?\n/);
  const messages = [];
  const myNorm = normalizeName(myName);
  const friendNorm = normalizeName(friendName);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parsed = matchLine(line);

    if (parsed && parsed.sender) {
      const senderNorm = normalizeName(parsed.sender);
      let speaker = "unknown";
      if (senderNorm.includes(myNorm) || myNorm.includes(senderNorm)) {
        speaker = "me";
      } else if (senderNorm.includes(friendNorm) || friendNorm.includes(senderNorm)) {
        speaker = "friend";
      }

      messages.push({
        speaker,
        sender: parsed.sender.trim(),
        text: parsed.text.trim(),
        timestamp: parsed.date ? `${parsed.date} ${parsed.time}` : null,
      });
    } else if (messages.length > 0) {
      messages[messages.length - 1].text += `\n${line}`;
    }
  }

  return messages.filter((m) => m.speaker !== "unknown" && m.text.length > 0);
}

export function groupConsecutiveTurns(messages) {
  const turns = [];
  for (const msg of messages) {
    const last = turns[turns.length - 1];
    if (last && last.speaker === msg.speaker) {
      last.text += `\n${msg.text}`;
    } else {
      turns.push({ speaker: msg.speaker, text: msg.text });
    }
  }
  return turns;
}

export function buildShortTermContext(messages, friendName, maxChars = 12000) {
  const turns = groupConsecutiveTurns(messages);
  const lines = turns.map((t) => `${t.speaker === "me" ? "Me" : friendName}: ${t.text}`);
  let transcript = lines.join("\n");

  if (transcript.length > maxChars) {
    transcript = transcript.slice(transcript.length - maxChars);
  }

  return [
    `You are ${friendName}. Below is a real text conversation history between ${friendName} and the user.`,
    `Study ${friendName}'s tone, vocabulary, punctuation, emoji usage, message length, and rhythm, then reply as ${friendName} would in future messages.`,
    `--- CONVERSATION HISTORY START ---`,
    transcript,
    `--- CONVERSATION HISTORY END ---`,
  ].join("\n\n");
}

export function buildFineTuneDataset(messages, friendName, windowSize = 6) {
  const turns = groupConsecutiveTurns(messages);
  const dataset = [];

  for (let i = 0; i < turns.length; i++) {
    if (turns[i].speaker !== "friend") continue;

    const contextTurns = turns.slice(Math.max(0, i - windowSize), i);
    if (contextTurns.length === 0) continue;

    const conversationMessages = contextTurns.map((t) => ({
      role: t.speaker === "me" ? "user" : "assistant",
      content: t.text,
    }));

    dataset.push({
      messages: [
        {
          role: "system",
          content: `You are ${friendName}, replying to texts in their authentic personal style.`,
        },
        ...conversationMessages,
        { role: "assistant", content: turns[i].text },
      ],
    });
  }

  return dataset;
}