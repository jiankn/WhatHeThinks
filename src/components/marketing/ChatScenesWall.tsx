"use client";

import { useState } from "react";
import Image from "next/image";

const SCENES = [
  ["Talking stage", "You", "Had fun tonight :)", "Him", "me toooo", "Replies are warm — but you still start most days.", "/images/scenes/talking-stage.svg"],
  ["First dates", "Him", "Thursday at 7? I found a place", "You", "Perfect. Send me the spot", "Plans get more specific when effort is rising.", "/images/scenes/first-dates.svg"],
  ["Boyfriend", "You", "Made it home?", "Him", "yeah sorry long day", "Small routines can reveal who keeps the connection going.", "/images/scenes/boyfriend.svg"],
  ["Situationship", "Him", "miss you", "You", "When are you free?", "Warm words and vague plans can point in different directions.", "/images/scenes/situationship.svg"],
  ["Long distance", "You", "Call after work?", "Him", "I can in like 20", "Consistency matters more when time zones get in the way.", "/images/scenes/long-distance.svg"],
  ["Mixed signals", "Him", "you looked amazing btw", "You", "Are we still on for Saturday?", "Attention is not the same thing as follow-through.", "/images/scenes/mixed-signals.svg"],
  ["Reconnecting with an ex", "Him", "been thinking about you", "You", "What made you reach out?", "A return matters less than whether the old pattern changed.", "/images/scenes/reconnecting-ex.svg"],
  ["Fading effort", "You", "How was your day?", "Him", "good", "Shorter replies matter when they become a pattern, not once.", "/images/scenes/fading-effort.svg"],
] as const;

function SceneCard({ scene }: { scene: (typeof SCENES)[number] }) {
  return (
    <article className="scene-card" tabIndex={0}>
      <Image className="scene-art" src={scene[6]} alt="" width={320} height={96} loading="lazy" />
      <div className="scene-card-body">
        <p className="scene-label">{scene[0]}</p>
        <div className="scene-bubble scene-bubble-you"><strong>{scene[1]}</strong>{scene[2]}</div>
        <div className="scene-bubble scene-bubble-him"><strong>{scene[3]}</strong>{scene[4]}</div>
        <p className="scene-observation">{scene[5]}</p>
      </div>
    </article>
  );
}

export function ChatScenesWall() {
  const [paused, setPaused] = useState(false);
  const repeated = [...SCENES, ...SCENES];

  return (
    <section className={`chat-scenes ${paused ? "is-paused" : ""}`} aria-labelledby="scenes-title">
      <div className="marketing-container scenes-heading">
        <div>
          <p className="eyebrow">Real patterns, fictional examples</p>
          <h2 id="scenes-title">Sound familiar?</h2>
          <p>Different chats. Patterns you can recognize.</p>
        </div>
        <button className="scene-pause" type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
          {paused ? "Continue" : "Pause"}
        </button>
      </div>
      <div className="scene-window">
        <div className="scene-track scene-track-forward">{repeated.map((scene, index) => <SceneCard key={`a-${index}`} scene={scene} />)}</div>
        <div className="scene-track scene-track-reverse">{repeated.map((scene, index) => <SceneCard key={`b-${index}`} scene={scene} />)}</div>
      </div>
      <p className="scene-disclaimer">Illustrative conversations — not customer testimonials.</p>
    </section>
  );
}
