/**
 * Static content for the demo seed (seed-demo.ts). Fictional people and places only.
 * Questions follow the Question Import Schema enums (slice-3).
 */

export interface DemoQuestion {
  type: 'multiple_choice' | 'fill_blank' | 'true_false'
  difficulty: 'easy' | 'medium' | 'hard'
  text: string
  options?: string[]
  answer: string
}

export type DemoLevel = 'starter' | 'mover' | 'flyer'

export const DEMO_CENTER = 'Trung tâm Anh ngữ Sunshine (demo)'

export const DEMO_BRANCHES = [
  { name: 'Cơ sở Cầu Giấy', address: '25 Trần Thái Tông, Cầu Giấy, Hà Nội' },
  { name: 'Cơ sở Hai Bà Trưng', address: '102 Bạch Mai, Hai Bà Trưng, Hà Nội' },
  { name: 'Cơ sở Quận 7', address: '88 Nguyễn Thị Thập, Quận 7, TP.HCM' },
] as const

export const DEMO_TEACHERS = [
  'nguyen.thu.ha',
  'tran.minh.quan',
  'le.thanh.huong',
  'pham.duc.anh',
  'hoang.mai.linh',
  'vu.quoc.bao',
] as const

export const DEMO_STAFF = ['do.thi.lan', 'bui.van.nam', 'ngo.thu.trang'] as const

const FAMILY = ['nguyen', 'tran', 'le', 'pham', 'hoang', 'vu', 'dang', 'bui', 'do', 'ngo', 'duong', 'ly']
const MIDDLE = ['minh', 'thu', 'gia', 'bao', 'ngoc', 'khanh', 'anh', 'hai', 'phuong', 'tuan']
const GIVEN = [
  'an', 'binh', 'chi', 'dung', 'giang', 'han', 'khoa', 'lam', 'my', 'nhi',
  'phuc', 'quynh', 'son', 'tam', 'uyen', 'vy', 'yen', 'long', 'trang', 'nam',
]

/** Deterministic, unique email-style slugs for demo students. */
export function studentSlug(i: number): string {
  const f = FAMILY[i % FAMILY.length]
  const m = MIDDLE[Math.floor(i / FAMILY.length) % MIDDLE.length]
  const g = GIVEN[(i * 7) % GIVEN.length]
  return `${f}.${m}.${g}${i + 1}`
}

/** Accented Vietnamese display names, parallel to FAMILY/MIDDLE/GIVEN (same order). */
const FAMILY_VI = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý']
const MIDDLE_VI = ['Minh', 'Thu', 'Gia', 'Bảo', 'Ngọc', 'Khánh', 'Anh', 'Hải', 'Phương', 'Tuấn']
const GIVEN_VI = [
  'An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hân', 'Khoa', 'Lâm', 'My', 'Nhi',
  'Phúc', 'Quỳnh', 'Sơn', 'Tâm', 'Uyên', 'Vy', 'Yến', 'Long', 'Trang', 'Nam',
]

/**
 * Deterministic accented Vietnamese full name for a demo student, derived from the same
 * index arithmetic as studentSlug (family + middle + given), e.g. "Nguyễn Minh An".
 */
export function studentFullName(i: number): string {
  const f = FAMILY_VI[i % FAMILY_VI.length]
  const m = MIDDLE_VI[Math.floor(i / FAMILY_VI.length) % MIDDLE_VI.length]
  const g = GIVEN_VI[(i * 7) % GIVEN_VI.length]
  return `${f} ${m} ${g}`
}

/**
 * Accented Vietnamese form for each ASCII name token used in DEMO_STAFF / DEMO_TEACHERS slugs.
 * Keeps staff/teacher display names deterministic from the seed data instead of a one-off SQL
 * backfill. Every token in those slugs must have an entry here (guarded by staffFullName + tests).
 */
const STAFF_NAME_TOKENS_VI: Readonly<Record<string, string>> = {
  // Họ (family)
  nguyen: 'Nguyễn', tran: 'Trần', le: 'Lê', pham: 'Phạm', hoang: 'Hoàng', vu: 'Vũ',
  bui: 'Bùi', do: 'Đỗ', ngo: 'Ngô',
  // Chữ lót + tên (middle / given)
  thu: 'Thu', ha: 'Hà', minh: 'Minh', quan: 'Quân', thanh: 'Thanh', huong: 'Hương',
  duc: 'Đức', anh: 'Anh', mai: 'Mai', linh: 'Linh', quoc: 'Quốc', bao: 'Bảo',
  thi: 'Thị', lan: 'Lan', van: 'Văn', nam: 'Nam', trang: 'Trang',
}

/**
 * Accented Vietnamese full name ("Họ giữa Tên") for a staff/teacher slug such as `do.thi.lan`
 * → "Đỗ Thị Lan". Throws if the slug contains a token without an accented mapping, so new demo
 * accounts can't silently fall back to a blank name.
 */
export function staffFullName(slug: string): string {
  return slug
    .split('.')
    .map((token) => {
      const vi = STAFF_NAME_TOKENS_VI[token]
      if (!vi) throw new Error(`staffFullName: thiếu ánh xạ tên có dấu cho token "${token}" (slug "${slug}")`)
      return vi
    })
    .join(' ')
}

export const DEMO_COURSES: ReadonlyArray<{ level: DemoLevel; name: string }> = [
  { level: 'starter', name: 'Starters - Khóa nền tảng' },
  { level: 'mover', name: 'Movers - Khóa phát triển' },
  { level: 'flyer', name: 'Flyers - Khóa nâng cao' },
]

export const READING: Record<DemoLevel, DemoQuestion[]> = {
  starter: [
    { type: 'multiple_choice', difficulty: 'easy', text: 'What color is a banana?', options: ['Blue', 'Yellow', 'Red', 'Black'], answer: 'Yellow' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'How many legs does a cat have?', options: ['Two', 'Three', 'Four', 'Six'], answer: 'Four' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Which one is an animal?', options: ['Chair', 'Dog', 'Book', 'Pen'], answer: 'Dog' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'I eat with my ___.', options: ['ears', 'feet', 'mouth', 'hair'], answer: 'mouth' },
    { type: 'fill_blank', difficulty: 'easy', text: 'One, two, ___, four.', answer: 'three' },
    { type: 'fill_blank', difficulty: 'medium', text: 'The sun is in the ___.', answer: 'sky' },
    { type: 'true_false', difficulty: 'easy', text: 'A fish can swim.', options: ['True', 'False'], answer: 'True' },
    { type: 'true_false', difficulty: 'easy', text: 'An elephant is small.', options: ['True', 'False'], answer: 'False' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'She ___ a red ball.', options: ['have', 'has', 'is', 'are'], answer: 'has' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Where do you sleep?', options: ['In the kitchen', 'In the bedroom', 'In the garden', 'In the bath'], answer: 'In the bedroom' },
    { type: 'fill_blank', difficulty: 'medium', text: 'This is my mother. ___ name is Lan.', answer: 'Her' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'Choose the correct sentence.', options: ['They is happy.', 'They are happy.', 'They am happy.', 'They be happy.'], answer: 'They are happy.' },
  ],
  mover: [
    { type: 'multiple_choice', difficulty: 'easy', text: 'Yesterday I ___ to the park.', options: ['go', 'goes', 'went', 'going'], answer: 'went' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Which month comes after March?', options: ['February', 'April', 'June', 'May'], answer: 'April' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'A doctor works in a ___.', options: ['school', 'hospital', 'bank', 'farm'], answer: 'hospital' },
    { type: 'fill_blank', difficulty: 'easy', text: 'My brother is ___ than me. (tall)', answer: 'taller' },
    { type: 'fill_blank', difficulty: 'medium', text: 'There are seven days in a ___.', answer: 'week' },
    { type: 'true_false', difficulty: 'easy', text: 'Winter is usually colder than summer.', options: ['True', 'False'], answer: 'True' },
    { type: 'true_false', difficulty: 'medium', text: 'We use an umbrella when it is sunny and dry.', options: ['True', 'False'], answer: 'False' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'How ___ apples are there?', options: ['much', 'many', 'any', 'some'], answer: 'many' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'You should ___ your teeth every morning.', options: ['wash', 'brush', 'clean up', 'cut'], answer: 'brush' },
    { type: 'fill_blank', difficulty: 'hard', text: 'She has lived here ___ 2020.', answer: 'since' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'The opposite of "dangerous" is ___.', options: ['safe', 'quick', 'heavy', 'quiet'], answer: 'safe' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'I was watching TV when the phone ___.', options: ['ring', 'rings', 'rang', 'ringing'], answer: 'rang' },
  ],
  flyer: [
    { type: 'multiple_choice', difficulty: 'medium', text: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'stayed', 'would stayed'], answer: 'will stay' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'A person who writes books is an ___.', options: ['actor', 'author', 'artist', 'engineer'], answer: 'author' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Which word is an adverb?', options: ['quick', 'quickly', 'quickness', 'quicker'], answer: 'quickly' },
    { type: 'fill_blank', difficulty: 'medium', text: 'The museum ___ built in 1890. (be, passive)', answer: 'was' },
    { type: 'fill_blank', difficulty: 'hard', text: 'I have never ___ to Japan. (be)', answer: 'been' },
    { type: 'true_false', difficulty: 'easy', text: 'The plural of "child" is "children".', options: ['True', 'False'], answer: 'True' },
    { type: 'true_false', difficulty: 'medium', text: '"Fewer" is used with uncountable nouns.', options: ['True', 'False'], answer: 'False' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'She asked me where I ___.', options: ['live', 'lived', 'am living', 'do live'], answer: 'lived' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'Choose the best word: The test was ___ difficult that nobody finished.', options: ['such', 'so', 'too', 'very'], answer: 'so' },
    { type: 'fill_blank', difficulty: 'hard', text: 'He is the man ___ car was stolen.', answer: 'whose' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'An "astronaut" travels into ___.', options: ['the sea', 'space', 'the desert', 'the jungle'], answer: 'space' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'We use a ___ to take photos.', options: ['camera', 'kettle', 'ruler', 'pillow'], answer: 'camera' },
  ],
}

export const LISTENING: Record<DemoLevel, DemoQuestion[]> = {
  starter: [
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "The cat is under the table." Where is the cat?', options: ['On the table', 'Under the table', 'In the box', 'Behind the door'], answer: 'Under the table' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "Tom has three apples." How many apples?', options: ['One', 'Two', 'Three', 'Five'], answer: 'Three' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "My bag is green." What color is the bag?', options: ['Green', 'Pink', 'Brown', 'White'], answer: 'Green' },
    { type: 'true_false', difficulty: 'easy', text: 'Listen: "Anna likes ice cream." Anna likes ice cream.', options: ['True', 'False'], answer: 'True' },
    { type: 'true_false', difficulty: 'medium', text: 'Listen: "Ben is eight years old." Ben is nine.', options: ['True', 'False'], answer: 'False' },
    { type: 'fill_blank', difficulty: 'medium', text: 'Listen: "I can see a bird." I can see a ___.', answer: 'bird' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "Sam is playing football." What is Sam doing?', options: ['Reading', 'Swimming', 'Playing football', 'Singing'], answer: 'Playing football' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'Listen: "Lucy\'s kite is next to the tree." Where is the kite?', options: ['In the tree', 'Next to the tree', 'On the house', 'In the water'], answer: 'Next to the tree' },
    { type: 'fill_blank', difficulty: 'hard', text: 'Listen: "My name is Kim, K-I-M." Her name is ___.', answer: 'Kim' },
  ],
  mover: [
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "The bus leaves at half past seven." When does the bus leave?', options: ['7:00', '7:15', '7:30', '8:30'], answer: '7:30' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "Jack went to the zoo with his uncle." Who did Jack go with?', options: ['His aunt', 'His uncle', 'His friend', 'His teacher'], answer: 'His uncle' },
    { type: 'true_false', difficulty: 'easy', text: 'Listen: "It was raining on Saturday." Saturday was sunny.', options: ['True', 'False'], answer: 'False' },
    { type: 'true_false', difficulty: 'medium', text: 'Listen: "Mia bought a new pair of shoes." Mia bought shoes.', options: ['True', 'False'], answer: 'True' },
    { type: 'fill_blank', difficulty: 'medium', text: 'Listen: "The library is on Pine Street." The library is on ___ Street.', answer: 'Pine' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "Peter is the boy with curly hair." Which one is Peter?', options: ['Straight hair', 'Curly hair', 'No hair', 'Long blond hair'], answer: 'Curly hair' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'Listen: "We need two bottles of water and some bread." What do they need?', options: ['Milk and eggs', 'Water and bread', 'Juice and rice', 'Tea and cake'], answer: 'Water and bread' },
    { type: 'fill_blank', difficulty: 'hard', text: 'Listen: "Her birthday is on the fifteenth of May." Her birthday is in ___.', answer: 'May' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "Grandma lives in the countryside." Where does Grandma live?', options: ['In the city', 'In the countryside', 'By the sea', 'In a flat'], answer: 'In the countryside' },
  ],
  flyer: [
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "The concert has been moved to Friday evening." When is the concert?', options: ['Thursday', 'Friday evening', 'Saturday morning', 'Sunday'], answer: 'Friday evening' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "I would rather take the train than drive." How does the speaker prefer to travel?', options: ['By car', 'By train', 'By plane', 'On foot'], answer: 'By train' },
    { type: 'true_false', difficulty: 'medium', text: 'Listen: "The museum is closed on Mondays." You can visit on Monday.', options: ['True', 'False'], answer: 'False' },
    { type: 'true_false', difficulty: 'easy', text: 'Listen: "Emma has been learning the piano for two years." Emma plays the piano.', options: ['True', 'False'], answer: 'True' },
    { type: 'fill_blank', difficulty: 'hard', text: 'Listen: "The project is due on the twenty-first." The project is due on the ___. (number)', answer: '21st|twenty-first' },
    { type: 'multiple_choice', difficulty: 'hard', text: 'Listen: "Had I known, I would have called you." Did the speaker know?', options: ['Yes', 'No', 'Maybe', 'Not mentioned'], answer: 'No' },
    { type: 'multiple_choice', difficulty: 'medium', text: 'Listen: "The weather forecast says it will be foggy." What will the weather be like?', options: ['Sunny', 'Foggy', 'Snowy', 'Windy'], answer: 'Foggy' },
    { type: 'fill_blank', difficulty: 'medium', text: 'Listen: "Turn left at the bakery." Turn ___ at the bakery.', answer: 'left' },
    { type: 'multiple_choice', difficulty: 'easy', text: 'Listen: "My cousin is a pilot." What is the cousin\'s job?', options: ['Pilot', 'Chef', 'Nurse', 'Farmer'], answer: 'Pilot' },
  ],
}
