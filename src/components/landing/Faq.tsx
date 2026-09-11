const QUESTIONS = [
  {
    q: "Can I apply to more than one track?",
    a: "Yes. One account covers every track, and you get one application for each. Plenty of people apply as a hacker and a volunteer.",
  },
  {
    q: "Do I need a team?",
    a: "No. Teams are up to four people, and team formation runs Friday night, so coming solo is completely fine.",
  },
  {
    q: "Is it okay if this is my first hackathon?",
    a: "Yes. There is a question for it on the form, and first-timers get extra mentor time over the weekend.",
  },
  {
    q: "What does my guide actually do?",
    a: "On the application, press ⌘J (Ctrl+J on Windows) and ask a question, typed or spoken. Your guide highlights the field you mean, gives a short example, or explains what the question is asking.",
  },
  {
    q: "Will the guide write my application for me?",
    a: "No. Examples are short and meant as a starting point. The answers reviewers read are yours.",
  },
  {
    q: "Can I edit after I submit?",
    a: "Drafts save as you type and stay editable until you submit. After that the application is locked, so every reviewer reads the same version.",
  },
  {
    q: "When will I hear back?",
    a: "Your status page shows each decision as soon as organizers set it.",
  },
];

export function Faq() {
  return (
    <div className="encore-faq">
      {QUESTIONS.map((item) => (
        <details key={item.q}>
          <summary>
            <span>{item.q}</span>
            <i aria-hidden />
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
