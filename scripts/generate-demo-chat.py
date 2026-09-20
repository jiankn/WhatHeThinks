"""Generate an explicitly fictional WhatsApp upload fixture, with no personal data."""
from datetime import datetime, timedelta
from pathlib import Path
import json, zipfile

out = Path('reports/test-data')
out.mkdir(parents=True, exist_ok=True)
start = datetime(2026, 6, 22, 12, 10)
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
    early = week < 6
    for day in range(6):
        base = start + timedelta(weeks=week, days=day, minutes=(week*7+day*11)%43)
        if early:
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
            # Five Jake-initiated days and one Emily-initiated day per week.
            if day == 2:
                speakers = ['Emily', 'Jake'] * 5
            else:
                speakers = ['Jake', 'Emily'] * 5
            minute = 0
            for i, (speaker, text) in enumerate(zip(speakers, texts)):
                if i: minute += 2 + (week + day + i) % 7
                add(base, minute, speaker, text)
        else:
            scenes = [
                [f'Hey, {work} went well today. How is your week starting?',
                 'Did you get through that big pile of work?', 'yeah pretty busy',
                 'Glad you are okay. I wanted to tell you about it.', 'nice',
                 'Maybe we can catch up when you have a bit more time.'],
                [f'Would you still like to visit {activity} together?',
                 'I am free Saturday afternoon if that helps.', 'maybe, not sure yet',
                 'Okay. Could you let me know by Friday?', 'will see',
                 'I will make my own plans if I do not hear back.'],
                ['Saw something that reminded me of our first dinner 🙂',
                 'How has your day been?', 'fine just tired',
                 'Long day here too. Do you feel like a short call later?', 'not tonight',
                 'Okay, get some rest.'],
                [f'I was near {venue} earlier. It made me smile.',
                 'I miss our longer conversations.', 'yeah been a lot going on',
                 'I understand busy weeks. It has felt different lately though.', 'sorry',
                 'Thanks. I would rather talk about it than keep guessing.'],
                ['Checking once about tomorrow before I arrange my weekend.',
                 'Are you free to meet at 2?', 'cant this weekend',
                 'Okay. Is there another day you would like to suggest?', 'not sure',
                 'All right, I will leave it with you.'],
                ['hey, miss you', 'It is good to hear from you. I miss spending time together.',
                 'When would you like to meet?', 'soon hopefully',
                 'I would like an actual plan when you know your schedule.', 'yeah'],
            ]
            texts = scenes[day]
            speakers = ['Emily','Emily','Jake','Emily','Jake','Emily']
            minutes = [0,38,100+(week-6)*12,111+(week-6)*12,165+(week-6)*12,172+(week-6)*12]
            if day == 5:
                speakers = ['Jake','Emily','Emily','Jake','Emily','Jake']
                minutes = [0,5,14,138,145,236]
            for minute, speaker, text in zip(minutes, speakers, texts):
                add(base, minute, speaker, text)
        # Cover supported export details without using actual attachments.
        if week in (1, 4, 8) and day == 2:
            add(base, 290, 'Emily', 'image omitted')
        if week == 3 and day == 1:
            add(base, 100, 'Jake', 'Here is the plan:\nSaturday, 2 pm at the entrance.\nCoffee afterwards if you feel like it.')
        if week == 9 and day == 3:
            add(base, 290, 'Emily', 'Missed voice call')

events.sort(key=lambda e:e[0])
lines=['6/22/26, 12:00 PM - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.']
for at, sender, text in events:
    date=f'{at.month}/{at.day}/{str(at.year)[2:]}'
    clock=at.strftime('%I:%M %p').lstrip('0')
    lines.append(f'{date}, {clock} - {sender}: {text}')
name='WhatsApp-Emily-Jake-fictional.txt'
(out/name).write_text('\n'.join(lines)+'\n', encoding='utf-8')
with zipfile.ZipFile(out/'WhatsApp-Emily-Jake-fictional.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.write(out/name,arcname=name)
summary={'fictional':True,'you':'Emily','him':'Jake','messages':len(events),'start':str(events[0][0]),'end':str(events[-1][0]),'format':'Android WhatsApp, M/D/YY, 12-hour clock','turning_point_planted':'2026-08-03'}
(out/'README.md').write_text('''# 虚构 WhatsApp 测试聊天

仅供本地产品测试；Emily（女）与 Jake（男）及对话均为虚构，非真实用户数据。

上传 `WhatsApp-Emily-Jake-fictional.txt`，也可用同名 ZIP 测试压缩包导入。两个文件包含同一份记录。
选择 **You = Emily**，**Him = Jake**。日期格式为 **月/日/年（MDY）**。

故事覆盖 12 周：前 6 周男方常主动、回复较快、有具体约会；从 2026-08-03 起女方主动增多，男方回复变慢、变短、安排模糊，偶尔又表达想念。
英文对话适配当前英文产品。包含多行消息、表情、媒体占位与未接来电，不包含真实媒体附件。

这是为趋势与格式测试编写的合成记录，周内部分话题结构会重复；不代表自然聊天样本，不能用于评估模型真实世界准确率，也不保证固定分析结论。
''',encoding='utf-8')
print(json.dumps(summary))
