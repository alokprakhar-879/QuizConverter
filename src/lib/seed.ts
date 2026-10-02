import { db, ensureTablesCreated } from "@/db";
import { questions } from "@/db/schema";
import { insertDrafts } from "./questions";
import type { DraftQuestion } from "./types";

const DEMO: Array<{ category: string; items: DraftQuestion[] }> = [
  {
    category: "Physics — Mechanics",
    items: [
      {
        prompt: "Newton’s second law of motion states that force is equal to:",
        optionA: "Mass times acceleration",
        optionB: "Mass times velocity",
        optionC: "Weight divided by time",
        optionD: "Energy divided by distance",
        correctAnswer: "A",
        explanation: "F = ma relates net force to mass and acceleration.",
      },
      {
        prompt: "The SI unit of force is the:",
        optionA: "Joule",
        optionB: "Watt",
        optionC: "Newton",
        optionD: "Pascal",
        correctAnswer: "C",
        explanation: "One newton is 1 kg·m/s².",
      },
      {
        prompt: "Kinetic energy of a mass m moving at speed v is:",
        optionA: "mgh",
        optionB: "½mv²",
        optionC: "mv",
        optionD: "½kx²",
        correctAnswer: "B",
        explanation: "Translational kinetic energy is ½mv².",
      },
      {
        prompt: "Near Earth’s surface, gravitational acceleration is approximately:",
        optionA: "3.0 m/s²",
        optionB: "9.8 m/s²",
        optionC: "15 m/s²",
        optionD: "1.6 m/s²",
        correctAnswer: "B",
      },
      {
        prompt: "If no external force acts on a system, which quantity is conserved?",
        optionA: "Temperature",
        optionB: "Linear momentum",
        optionC: "Volume",
        optionD: "Charge density",
        correctAnswer: "B",
      },
    ],
  },
  {
    category: "Computer Science",
    items: [
      {
        prompt: "The average time complexity of binary search on a sorted array is:",
        optionA: "O(n)",
        optionB: "O(log n)",
        optionC: "O(n log n)",
        optionD: "O(1)",
        correctAnswer: "B",
      },
      {
        prompt: "HTTPS differs from HTTP primarily because it:",
        optionA: "Uses a different HTML version",
        optionB: "Encrypts traffic with TLS",
        optionC: "Only works on mobile networks",
        optionD: "Removes cookies entirely",
        correctAnswer: "B",
      },
      {
        prompt: "In a relational database, a primary key must be:",
        optionA: "Nullable and duplicated",
        optionB: "Unique and not null",
        optionC: "Always an integer timestamp",
        optionD: "Stored in a separate file",
        correctAnswer: "B",
      },
      {
        prompt: "A stack data structure follows which order?",
        optionA: "FIFO",
        optionB: "LIFO",
        optionC: "Random access",
        optionD: "Priority first",
        correctAnswer: "B",
      },
      {
        prompt: "Which HTTP method is idempotent and typically used to replace a resource?",
        optionA: "POST",
        optionB: "PATCH",
        optionC: "PUT",
        optionD: "CONNECT",
        correctAnswer: "C",
      },
    ],
  },
  {
    category: "World History",
    items: [
      {
        prompt: "The fall of Constantinople to the Ottomans occurred in:",
        optionA: "1204",
        optionB: "1453",
        optionC: "1492",
        optionD: "1683",
        correctAnswer: "B",
      },
      {
        prompt: "The French Revolution is conventionally dated as beginning in:",
        optionA: "1776",
        optionB: "1789",
        optionC: "1815",
        optionD: "1848",
        correctAnswer: "B",
      },
      {
        prompt: "World War I began in:",
        optionA: "1912",
        optionB: "1914",
        optionC: "1918",
        optionD: "1939",
        correctAnswer: "B",
      },
      {
        prompt: "Magna Carta was sealed in England in:",
        optionA: "1066",
        optionB: "1215",
        optionC: "1415",
        optionD: "1689",
        correctAnswer: "B",
      },
      {
        prompt: "The Industrial Revolution began primarily in:",
        optionA: "Britain",
        optionB: "Russia",
        optionC: "Japan",
        optionD: "Brazil",
        correctAnswer: "A",
      },
    ],
  },
  {
    category: "Literature",
    items: [
      {
        prompt: "Who wrote the novel Nineteen Eighty-Four?",
        optionA: "Aldous Huxley",
        optionB: "George Orwell",
        optionC: "Ray Bradbury",
        optionD: "Franz Kafka",
        correctAnswer: "B",
      },
      {
        prompt: "“To be, or not to be” is spoken by which Shakespeare character?",
        optionA: "Macbeth",
        optionB: "King Lear",
        optionC: "Hamlet",
        optionD: "Othello",
        correctAnswer: "C",
      },
      {
        prompt: "Pride and Prejudice was written by:",
        optionA: "Charlotte Brontë",
        optionB: "Jane Austen",
        optionC: "George Eliot",
        optionD: "Virginia Woolf",
        correctAnswer: "B",
      },
      {
        prompt: "The Odyssey is attributed to:",
        optionA: "Virgil",
        optionB: "Homer",
        optionC: "Sophocles",
        optionD: "Ovid",
        correctAnswer: "B",
      },
      {
        prompt: "The Epic of Gilgamesh originates from which civilisation?",
        optionA: "Ancient Mesopotamia",
        optionB: "Classical Greece",
        optionC: "Imperial China",
        optionD: "Medieval France",
        correctAnswer: "A",
      },
    ],
  },
];

export async function seedIfEmpty() {
  await ensureTablesCreated();
  const existing = await db.select({ id: questions.id }).from(questions).limit(1);
  if (existing.length) return { seeded: false };
  for (const pack of DEMO) {
    await insertDrafts({
      drafts: pack.items,
      categoryName: pack.category,
      source: "seed",
      sourceFile: "studio-demo",
    });
  }
  return { seeded: true };
}
