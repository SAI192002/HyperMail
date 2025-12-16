import { Email, FolderType } from './types';

export const KEYBOARD_SHORTCUTS = {
  NEXT_EMAIL: 'j',
  PREV_EMAIL: 'k',
  COMPOSE: 'c',
  SEARCH: '/', // or cmd+k usually
  ARCHIVE: 'e',
  DELETE: 'd', // Shortcut for delete
  REPLY: 'r',
  REPLY_ALL: 'a',
  FORWARD: 'f',
  ESCAPE: 'Escape',
};

const MOCK_BODY_TEXT = `Hi there,

Just checking in on the status of the project. We are hoping to launch by next Friday.

Let me know if you need any assistance with the remaining tasks.

Best,
`;

export const MOCK_EMAILS: Email[] = [
  {
    id: '1',
    threadId: 't1',
    fromName: 'Elon Musk',
    fromEmail: 'elon@tesla.com',
    subject: 'Mars Colonization Update',
    preview: 'The Starship launch was successful, but we need to discuss...',
    body: `Team,\n\nThe Starship launch was successful, but we need to discuss the fuel efficiency for the return trip. The trajectory calculations are slightly off.\n\nAlso, we need to accelerate the habitat construction timeline. 2029 is right around the corner.\n\nBest,\nElon`,
    date: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isRead: false,
    isStarred: true,
    avatarColor: 'bg-red-500',
    intent: 'Urgent',
    priority: 10
  },
  {
    id: '2',
    threadId: 't2',
    fromName: 'Sam Altman',
    fromEmail: 'sam@openai.com',
    subject: 'AGI Timeline Acceleration',
    preview: 'We are seeing exponential improvements in the latest model...',
    body: `Hey,\n\nWe are seeing exponential improvements in the latest model training runs. I think we might need to revise our safety protocols sooner than expected.\n\nLet's sync up tomorrow morning to go over the new benchmarks.\n\nCheers,\nSam`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
    isStarred: false,
    avatarColor: 'bg-green-500',
    intent: 'Meeting',
    priority: 9
  },
  {
    id: '3',
    threadId: 't3',
    fromName: 'Satya Nadella',
    fromEmail: 'satya@microsoft.com',
    subject: 'Q3 Cloud Strategy',
    preview: 'Azure growth has been phenomenal, but we need to pivot...',
    body: `Team,\n\nAzure growth has been phenomenal, but we need to pivot our focus towards AI-native infrastructure. The market is shifting rapidly.\n\nPlease prepare a deck for the board meeting next Tuesday.\n\nRegards,\nSatya`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    isStarred: false,
    avatarColor: 'bg-blue-500',
    intent: 'Action',
    priority: 8
  },
  {
    id: '4',
    threadId: 't4',
    fromName: 'Tim Cook',
    fromEmail: 'tcook@apple.com',
    subject: 'Vision Pro Production',
    preview: 'Supply chain constraints are easing up. We should...',
    body: `Hi all,\n\nSupply chain constraints are easing up. We should be able to ramp up Vision Pro production by 20% next month.\n\nLet's ensure the spatial computing apps are ready for the influx of new users.\n\nTim`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isRead: true,
    isStarred: false,
    avatarColor: 'bg-gray-500',
    intent: 'FYI',
    priority: 5
  },
  {
    id: '5',
    threadId: 't5',
    fromName: 'Jensen Huang',
    fromEmail: 'jensen@nvidia.com',
    subject: 'H100 Allocation',
    preview: 'The demand for H100s is still outpacing supply...',
    body: `Friends,\n\nThe demand for H100s is still outpacing supply. We need to prioritize our strategic partners.\n\nI'm wearing my leather jacket as I write this.\n\nJensen`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isRead: true,
    isStarred: true,
    avatarColor: 'bg-green-600',
    intent: 'Urgent',
    priority: 9
  },
   {
    id: '6',
    threadId: 't6',
    fromName: 'Mark Zuckerberg',
    fromEmail: 'zuck@meta.com',
    subject: 'Metaverse vs AI',
    preview: 'I want to clarify our stance on the open source models...',
    body: `Team,\n\nI want to clarify our stance on the open source models. Llama 3 is performing well. Let's double down on open compute.\n\nAlso, check out the new avatar legs update.\n\nMark`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    isRead: false,
    isStarred: false,
    avatarColor: 'bg-blue-600',
    intent: 'FYI',
    priority: 4
  },
  {
    id: '7',
    threadId: 't7',
    fromName: 'Jeff Bezos',
    fromEmail: 'jeff@blueorigin.com',
    subject: 'Gradatim Ferociter',
    preview: 'Slow is smooth, smooth is fast. But we need to be faster...',
    body: `Crew,\n\nSlow is smooth, smooth is fast. But we need to be faster. The orbital reef project needs more attention.\n\nI'll be at the launch site this weekend.\n\nJeff`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    isRead: true,
    isStarred: false,
    avatarColor: 'bg-yellow-500',
    intent: 'Newsletter',
    priority: 2
  }
];
