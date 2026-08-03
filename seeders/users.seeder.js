import bcrypt from "bcrypt";

import pool from "../src/config/database.js";

const SALT_ROUNDS = 10;
const TOTAL_USERS = 50000;
const BATCH_SIZE = 5000;
const firstNames = [
  "Liam",
  "Olivia",
  "Noah",
  "Emma",
  "Oliver",
  "Ava",
  "Elijah",
  "Charlotte",
  "William",
  "Sophia",
  "James",
  "Amelia",
  "Benjamin",
  "Isabella",
  "Lucas",
  "Mia",
  "Henry",
  "Evelyn",
  "Alexander",
  "Harper",
  "Mason",
  "Camila",
  "Michael",
  "Gianna",
  "Ethan",
  "Abigail",
  "Daniel",
  "Luna",
  "Jacob",
  "Ella",
  "Logan",
  "Elizabeth",
  "Jackson",
  "Sofia",
  "Levi",
  "Avery",
  "Sebastian",
  "Scarlett",
  "Jack",
  "Emily",
  "Leo",
  "Aria",
  "Julian",
  "Penelope",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
];

async function add_user() {
  const hashedPassword = await bcrypt.hash("vanshjatt", SALT_ROUNDS);

  const phoneNumbers = new Set();

  while (phoneNumbers.size < TOTAL_USERS) {
    const randomNum = Math.floor(
      1000000000 + Math.random() * 9000000000,
    ).toString();

    phoneNumbers.add(randomNum);
  }

  const phones = [...phoneNumbers];

  const connection = await pool.getConnection();

  try {
    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
      const values = [];

      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_USERS - i);

      for (let j = 0; j < currentBatchSize; j++) {
        const index = i + j;

        const randomFirst =
          firstNames[Math.floor(Math.random() * firstNames.length)];

        const randomLast =
          lastNames[Math.floor(Math.random() * lastNames.length)];

        values.push([
          randomFirst,
          randomLast,
          `${randomFirst.toLowerCase()}_${randomLast.toLowerCase()}_${index + 1}@gmail.com`,
          hashedPassword,
          phones[index],
        ]);
      }

      await connection.query(
        `INSERT INTO users
        (first_name, last_name, email, password, phone)
        VALUES ?`,
        [values],
      );

      console.log(
        `Inserted ${Math.min(i + BATCH_SIZE, TOTAL_USERS)} / ${TOTAL_USERS}`,
      );
    }

    console.log("50,000 users inserted successfully.");
  } catch (error) {
    console.error(error);
  } finally {
    connection.release();
  }
}

add_user();
