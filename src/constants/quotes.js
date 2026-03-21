export const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Concentrate all your thoughts upon the work in hand.", author: "Alexander Graham Bell" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
  { text: "One reason so few of us achieve what we truly want is that we never direct our focus.", author: "Tony Robbins" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Excellence is not a destination; it is a continuous journey.", author: "Brian Tracy" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Small steps every day lead to big changes over time.", author: "Anonymous" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Great things never came from comfort zones.", author: "Anonymous" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Study while others are sleeping; work while others are loafing.", author: "William Arthur Ward" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  { text: "Your limitation—it's only your imagination.", author: "Anonymous" },
  { text: "Sometimes later becomes never. Do it now.", author: "Anonymous" },
  { text: "Dream it. Wish it. Do it.", author: "Anonymous" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Anonymous" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous" },
];

export const getDailyQuote = () => {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  return QUOTES[dayOfYear % QUOTES.length];
};
