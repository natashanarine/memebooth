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
];

export const TRAIL_IMAGES = ALL_MEMES.map(m => m.imageUrl);
