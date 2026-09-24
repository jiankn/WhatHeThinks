"""Generate a second explicitly fictional WhatsApp upload fixture: a steady, mutual,
positive chat with no planted cooling trend. Complements WhatsApp-Emily-Jake-fictional.txt
(which cools at week 6) so the report and free-preview hook can also be tested on a chat
that should NOT read as concerning. No personal data.
"""
from datetime import datetime, timedelta
from pathlib import Path
import json, zipfile

out = Path('reports/test-data')
out.mkdir(parents=True, exist_ok=True)
start = datetime(2026, 7, 1, 12, 5)  # ends ~Sep 22, close to "today" for live testing
YOU, HIM = 'Nora', 'Theo'

topics = [
    ('the bookshop', 'the riverside cafe', 'your presentation'),
    ('the street market', 'the little Italian restaurant', 'your design review'),
    ('the photography exhibition', 'the park cafe', 'your new project'),
    ('the record shop', 'the noodle place', 'your workshop'),
    ('the botanical gardens', 'the bakery on King Street', 'your interview'),
    ('the outdoor cinema', 'the rooftop cafe', 'your portfolio review'),
    ('the food festival', 'the taco place', 'your team meeting'),
    ('the museum', 'the coffee shop near the station', 'your client call'),
    ('the farmers market', 'the pizza place', 'your presentation'),
    ('the riverside walk', 'the old tea room', 'your training session'),
    ('the gallery', 'the sushi place', 'your project deadline'),
    ('the weekend fair', 'the cafe by the bridge', 'your final review'),
]
events = []
def add(base, minutes, sender, text):
    events.append((base + timedelta(minutes=minutes), sender, text))

for week, (activity, venue, work) in enumerate(topics):
    for day in range(6):
        base = start + timedelta(weeks=week, days=day, minutes=(week * 7 + day * 11) % 43)
        scenes = [
            [f'Hey, how did {work} go? Been thinking about you.',
             'Better than I expected! I was nervous right up until it started.',
             'I knew you would be good. What did they say afterwards?',
             'They liked the idea. I still have a couple of things to fix.',
             'That sounds like a win. Want to celebrate with dinner Friday at 7?',
             f'Yes! Could we try {venue}?',
             'Absolutely. I will book a table for Friday at 7 pm.',
             'Thank you for remembering. That means a lot 🙂',
             'Of course. I wanted to hear how it went.', 'You just made my afternoon.'],
            [f'I walked past {activity} and thought of you.',
             'You remembered I wanted to go!', 'Want to go together Saturday at 2 pm?',
             'Yes, I am free then.', 'Great, shall I meet you at the entrance?',
             'That works. I might bring my camera.', 'Please do, I love seeing what you notice.',
             'Fair warning, there will be too many pictures.', 'I am prepared 😂', 'Deal.'],
            ['What was the best part of your day?', 'Honestly? Lunch outside instead of at my desk.',
             'That is progress! Did you go with anyone?', 'Maya came with me. We needed a break.',
             'Glad you got one. How are you feeling about the rest of the week?',
             'Less stressed now. How was your day?', 'Busy, but I finished the boring bit early.',
             'Nice! You earned a quiet evening.', 'I would rather hear your voice. Call at 8 tonight?',
             'Yes, talk at 8 ❤️'],
            ['I found the playlist you mentioned.', 'Oh really? Which song did you like?',
             'The second one. It reminds me of our walk.', 'That is my favourite too.',
             'What else should I listen to?', 'I will send you a few suggestions tonight.',
             'Looking forward to it. Still good for dinner tomorrow?', 'Definitely. Friday at 7.',
             'Booked it. I will send the address after work.', 'Perfect, see you there.'],
            [f'Looking forward to {venue} tonight. How is your morning?',
             'A bit hectic, but I am looking forward to it too.', 'No rush after work. Are you taking the train?',
             'Yes, I should be there just before 7.', 'I will meet you outside at 6:55.',
             'That is sweet, thank you.', 'Any food allergies I should have checked?',
             'None! Just very strong opinions about olives.', 'Noted. No surprise olives 😂',
             'Now I really am excited.'],
            [f'I had such a good time yesterday. Still on for {activity} at 2?',
             'Yes! I am glad we tried that place.', 'Me too. What was your favourite part?',
             'The conversation, actually. I forgot to check my phone.',
             'Same here. I feel really comfortable with you.', 'I feel that too.',
             'Want to get coffee afterwards if we have time?', 'I would like that.',
             'Then it is a plan. See you at 2.', 'See you soon 😊'],
        ]
        texts = scenes[day]
        # Balanced initiation across the week: roughly half the days each side opens,
        # unlike the cooling fixture's 5:1 split. Positive interest stays mutual throughout.
        speakers = [HIM, YOU] * 5 if day % 2 == 0 else [YOU, HIM] * 5
        minute = 0
        for i, (speaker, text) in enumerate(zip(speakers, texts)):
            if i: minute += 2 + (week + day + i) % 7
            add(base, minute, speaker, text)
        if week in (2, 5, 9) and day == 2:
            add(base, 290, YOU, 'image omitted')
        if week == 4 and day == 1:
            add(base, 100, HIM, 'Here is the plan:\nSaturday, 2 pm at the entrance.\nCoffee afterwards if you feel like it.')
        if week == 8 and day == 4:
            add(base, 290, YOU, 'Missed voice call')

events.sort(key=lambda e: e[0])
lines = ['7/1/26, 12:00 PM - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.']
for at, sender, text in events:
    date = f'{at.month}/{at.day}/{str(at.year)[2:]}'
    clock = at.strftime('%I:%M %p').lstrip('0')
    lines.append(f'{date}, {clock} - {sender}: {text}')
name = 'WhatsApp-Nora-Theo-fictional.txt'
(out / name).write_text('\n'.join(lines) + '\n', encoding='utf-8')
with zipfile.ZipFile(out / 'WhatsApp-Nora-Theo-fictional.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(out / name, arcname=name)
summary = {'fictional': True, 'you': YOU, 'him': HIM, 'messages': len(events),
           'start': str(events[0][0]), 'end': str(events[-1][0]),
           'format': 'Android WhatsApp, M/D/YY, 12-hour clock', 'turning_point_planted': None}
print(json.dumps(summary))
