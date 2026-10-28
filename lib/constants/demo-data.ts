// ExamBuddy Canonical Data and Demo Seed Definitions
// Karunya University NPTEL Exam Coordination

export interface CanonicalCenter {
  id: string;
  name: string;
  shortName: string;
  aliases: string[];
  address: string;
  city: string;
  landmark: string;
  googleMapsUrl: string;
}

export interface DemoStudent {
  id: string;
  name: string;
  registerNo: string;
  email: string;
  college: string;
  pickupArea: string;
  courseName: string;
  examCenter: string;
  examDate: string;
  session: "Forenoon" | "Afternoon";
  isDemo: boolean;
}

export interface SamplePresenter {
  name: string;
  registerNo: string;
  email: string;
  pickupArea: string;
  courseName: string;
  courseCode: string;
  examCenter: string;
  examDate: string;
  session: "Forenoon" | "Afternoon";
  reportingTime: string;
  examTime: string;
}

export const COLLEGE_NAME = "Karunya Institute of Technology and Sciences";
export const COLLEGE_EMAIL_DOMAIN = "@karunya.edu.in";
export const DEFAULT_EXAM_DATE = "2026-11-15";

export const EXAM_SESSIONS = {
  Forenoon: {
    label: "Forenoon (09:00 AM - 12:00 PM)",
    examTime: "09:00 AM - 12:00 PM",
    reportingTime: "07:30 AM",
    gateCloses: "08:45 AM",
    defaultMeetupTime: "06:45 AM",
  },
  Afternoon: {
    label: "Afternoon (02:00 PM - 05:00 PM)",
    examTime: "02:00 PM - 05:00 PM",
    reportingTime: "12:30 PM",
    gateCloses: "01:45 PM",
    defaultMeetupTime: "11:45 AM",
  },
} as const;

export const CANONICAL_EXAM_CENTERS: CanonicalCenter[] = [
  {
    id: "center-a",
    name: "iON Digital Zone iDZ Kovai Pudur",
    shortName: "iON Kovai Pudur",
    aliases: [
      "ion digital zone",
      "idz kovai pudur",
      "kovaipudur",
      "ion digital zone idz",
      "ion kovai",
      "tcs ion kovai pudur",
      "ion digital zone 1",
      "ion digital zone 2",
    ],
    address: "Kovai Pudur Main Road, Near Sri Krishna Polytechnic, Coimbatore, Tamil Nadu 641042",
    city: "Coimbatore",
    landmark: "Near Sri Krishna Polytechnic",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=iON+Digital+Zone+iDZ+Kovai+Pudur+Coimbatore",
  },
  {
    id: "center-b",
    name: "KGiSL Institute of Technology, Saravanampatti",
    shortName: "KGiSL Campus",
    aliases: [
      "kgisl",
      "kgisl institute of technology",
      "saravanampatti",
      "kgisl campus",
      "kgisl it",
      "kg campus",
    ],
    address: "KGiSL Campus, Thudiyalur Road, Saravanampatti, Coimbatore, Tamil Nadu 641035",
    city: "Coimbatore",
    landmark: "CHIL SEZ IT Park",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=KGiSL+Institute+of+Technology+Saravanampatti+Coimbatore",
  },
  {
    id: "center-c",
    name: "Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur",
    shortName: "SKCET Kuniamuthur",
    aliases: [
      "skcet",
      "sri krishna college of engineering and technology",
      "kuniamuthur",
      "sri krishna kuniamuthur",
      "skcet campus",
    ],
    address: "Sugunapuram, Kuniamuthur, Coimbatore, Tamil Nadu 641008",
    city: "Coimbatore",
    landmark: "Palakkad Main Road",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=SKCET+Kuniamuthur+Coimbatore",
  },
];

export const COIMBATORE_PICKUP_AREAS = [
  "Karunya Nagar (Campus Gate)",
  "Kovaipudur",
  "Gandhipuram",
  "Peelamedu",
  "Singanallur",
  "Kuniamuthur",
  "Ukkadam",
  "Saibaba Colony",
  "RS Puram",
  "Vadavalli",
];

// 10 Dummy Karunya Students defined in this single constants file
// Grouped to fulfill demo requirements:
// - Center A, Forenoon: 4 dummy students
// - Center B, Afternoon: 3 dummy students
// - Center C: 3 dummy students (different center, ensuring selective matching)
export const DEMO_STUDENTS: DemoStudent[] = [
  // --- CENTER A (Forenoon) : 4 Students ---
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Aarav Sharma",
    registerNo: "URK22CS1042",
    email: "aarav.s@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Karunya Nagar (Campus Gate)",
    courseName: "Cloud Computing and Distributed Systems",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Sneha Priya",
    registerNo: "URK22EC1015",
    email: "sneha.p@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Kovaipudur",
    courseName: "Deep Learning for Computer Vision",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Joel Mathew",
    registerNo: "URK22AI1088",
    email: "joel.m@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Gandhipuram",
    courseName: "Applied Natural Language Processing",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Divya R",
    registerNo: "URK22CS1190",
    email: "divya.r@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Peelamedu",
    courseName: "Cloud Computing and Distributed Systems",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },

  // --- CENTER B (Afternoon) : 3 Students ---
  {
    id: "00000000-0000-0000-0000-000000000005",
    name: "Rohan Thomas",
    registerNo: "URK22ME1034",
    email: "rohan.t@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Singanallur",
    courseName: "Robotics and Control Systems",
    examCenter: "KGiSL Institute of Technology, Saravanampatti",
    examDate: DEFAULT_EXAM_DATE,
    session: "Afternoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    name: "Ananya Nair",
    registerNo: "URK22BT1009",
    email: "ananya.n@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Saibaba Colony",
    courseName: "Bioinformatics: Algorithms and Applications",
    examCenter: "KGiSL Institute of Technology, Saravanampatti",
    examDate: DEFAULT_EXAM_DATE,
    session: "Afternoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    name: "Kevin Paul",
    registerNo: "URK22CS1055",
    email: "kevin.p@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "RS Puram",
    courseName: "Database Management Systems",
    examCenter: "KGiSL Institute of Technology, Saravanampatti",
    examDate: DEFAULT_EXAM_DATE,
    session: "Afternoon",
    isDemo: true,
  },

  // --- CENTER C : 3 Students (Selective matching proof) ---
  {
    id: "00000000-0000-0000-0000-000000000008",
    name: "Meera Krishnan",
    registerNo: "URK22EE1021",
    email: "meera.k@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Kuniamuthur",
    courseName: "Smart Grid Technologies",
    examCenter: "Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    name: "Sanjay Varma",
    registerNo: "URK22AI1012",
    email: "sanjay.v@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Ukkadam",
    courseName: "Reinforcement Learning",
    examCenter: "Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Afternoon",
    isDemo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    name: "Rachel Samuel",
    registerNo: "URK22CS1077",
    email: "rachel.s@karunya.edu.in",
    college: COLLEGE_NAME,
    pickupArea: "Vadavalli",
    courseName: "Software Engineering Agile Methodologies",
    examCenter: "Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    isDemo: true,
  },
];

// 4 Live Presenters for the 4 devices demo
// 3 Presenters for Center A (Forenoon) -> converge into Center A group
// 1 Presenter for Center B (Afternoon) -> joins Center B group
export const SAMPLE_PRESENTERS: SamplePresenter[] = [
  {
    name: "Daniel Raj",
    registerNo: "URK22CS1001",
    email: "daniel.raj@karunya.edu.in",
    pickupArea: "Karunya Nagar (Campus Gate)",
    courseName: "Cloud Computing and Distributed Systems",
    courseCode: "noc24-cs101",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    reportingTime: "07:30 AM",
    examTime: "09:00 AM - 12:00 PM",
  },
  {
    name: "Priya George",
    registerNo: "URK22CS1002",
    email: "priya.g@karunya.edu.in",
    pickupArea: "Gandhipuram",
    courseName: "Applied Natural Language Processing",
    courseCode: "noc24-cs108",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    reportingTime: "07:30 AM",
    examTime: "09:00 AM - 12:00 PM",
  },
  {
    name: "Samuel Paul",
    registerNo: "URK22AI1003",
    email: "samuel.p@karunya.edu.in",
    pickupArea: "Kovaipudur",
    courseName: "Deep Learning for Computer Vision",
    courseCode: "noc24-cs112",
    examCenter: "iON Digital Zone iDZ Kovai Pudur",
    examDate: DEFAULT_EXAM_DATE,
    session: "Forenoon",
    reportingTime: "07:30 AM",
    examTime: "09:00 AM - 12:00 PM",
  },
  {
    name: "Nithya Menon",
    registerNo: "URK22EC1004",
    email: "nithya.m@karunya.edu.in",
    pickupArea: "Singanallur",
    courseName: "Robotics and Control Systems",
    courseCode: "noc24-ee104",
    examCenter: "KGiSL Institute of Technology, Saravanampatti",
    examDate: DEFAULT_EXAM_DATE,
    session: "Afternoon",
    reportingTime: "12:30 PM",
    examTime: "02:00 PM - 05:00 PM",
  },
];
