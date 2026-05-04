export interface Meme {
  id: string;
  name: string;
  pose: string;
  imageUrl: string;
}

export const ALL_MEMES: Meme[] = [
  {
    id: 'thinking',
    name: 'Pondering',
    pose: 'bring one hand to your chin and look up',
    imageUrl: '/memes/monkey-think.jpg',
  },
  {
    id: 'hands-up',
    name: 'Hype',
    pose: 'raise both hands up with fingers spread',
    imageUrl: '/memes/monkey-hype.jpg',
  },
  {
    id: 'point-up',
    name: 'Peace Out',
    pose: 'throw up a peace sign with two fingers',
    imageUrl: '/memes/monkey-peace.jpg',
  },
  {
    id: 'sus',
    name: 'Sus',
    pose: 'bring one finger to the side of your mouth',
    imageUrl: '/memes/monkey-sus.jpg',
  },
  {
    id: 'shocked',
    name: 'Soft Launch',
    pose: 'cup both hands under your chin',
    imageUrl: '/memes/person-cute.jpg',
  },
  {
    id: 'chefs-kiss',
    name: 'No Cap',
    pose: 'grab your collar or lapel with one hand',
    imageUrl: '/memes/person-smug.jpg',
  },
  {
    id: 'vibing',
    name: 'Vibing',
    pose: 'tilt your head and raise one hand near your ear',
    imageUrl: '/memes/person-vibing.jpg',
  },
  {
    id: 'pool-laugh',
    name: 'Pool Szn',
    pose: 'put both hands behind your head',
    imageUrl: '/memes/pool-laugh.jpg',
  },
  {
    id: 'fists-chin',
    name: 'Wholesome',
    pose: 'rest both fists under your chin and grin',
    imageUrl: '/memes/fists-chin.jpg',
  },
  {
    id: 'point-forward',
    name: 'You Frfr',
    pose: 'extend both arms and point at the camera',
    imageUrl: '/memes/point-forward.jpg',
  },
  {
    id: 'victory',
    name: "Let's Go",
    pose: 'pump both fists up in the air',
    imageUrl: '/memes/victory.jpg',
  },
  {
    id: 'hands-on-head',
    name: "It's Giving",
    pose: 'grab your head with both hands',
    imageUrl: '/memes/hands-on-head.jpg',
  },
  {
    id: 'finger-bite',
    name: 'No Way',
    pose: 'bring one hand up to your mouth',
    imageUrl: '/memes/finger-bite.jpg',
  },
  {
    id: 'arms-wide',
    name: 'Facts',
    pose: 'spread both arms out wide to your sides',
    imageUrl: '/memes/arms-wide.jpg',
  },
  {
    id: 'shy',
    name: 'Shy',
    pose: 'scratch the back of your neck',
    imageUrl: '/memes/shy.jpg',
  },
  {
    id: 'hair-flip',
    name: 'Oop',
    pose: 'tuck your hair behind your ear',
    imageUrl: '/memes/hair-flip.jpg',
  },
  {
    id: 'chill',
    name: 'Chill',
    pose: 'lace both hands behind your head',
    imageUrl: '/memes/chill.jpg',
  },
  {
    id: 'me',
    name: 'Me??',
    pose: 'point at yourself with one finger',
    imageUrl: '/memes/me.jpg',
  },
  {
    id: 'heart',
    name: 'Luv U',
    pose: 'make a heart shape with both hands at your chest',
    imageUrl: '/memes/monkey-heart.jpg',
  },
  {
    id: 'timeout',
    name: 'Time Out',
    pose: 'make a T with your hands in front of you',
    imageUrl: '/memes/timeout.jpg',
  },
  {
    id: 'monkey-omg',
    name: 'OMG',
    pose: 'clasp both hands together at your chest',
    imageUrl: '/memes/monkey-omg.jpg',
  },
  {
    id: 'thumbs-up',
    name: 'Solid',
    pose: 'give a thumbs up at chest level',
    imageUrl: '/memes/thumbs-up.jpg',
  },
];

export const TRAIL_IMAGES = ALL_MEMES.map(m => m.imageUrl);
