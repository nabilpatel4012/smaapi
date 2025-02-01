import { faker } from "@faker-js/faker";
import axios from "axios";
import { config } from "../config";

const BASE_URL = `http://${config.HOST}:${config.PORT}/v1`;
const ITERATIONS = 20_000;
const DELAY_MS = 100;

interface Session {
  email: string;
  cookie: string | undefined;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createUser(): Promise<Session> {
  const email = faker.internet.email();
  const password = faker.internet.password();

  try {
    // Create user
    await axios.post(`${BASE_URL}/users`, {
      email,
      password,
    });

    // Login
    const loginResponse = await axios.post(
      `${BASE_URL}/users/sessions`,
      {
        email,
        password,
      },
      { withCredentials: true }
    );

    return {
      email,
      cookie: loginResponse.headers["set-cookie"]?.[0],
    };
  } catch (error) {
    console.error("Failed to create/login user:", error);
    throw error;
  }
}

async function createJob(session: Session) {
  try {
    const response = await axios.post(
      `${BASE_URL}/jobs`,
      {
        title: faker.person.jobTitle(),
        description: faker.lorem.paragraphs(2),
        status: faker.helpers.arrayElement(["active", "inactive"]),
        keywords: [
          faker.helpers.arrayElement([
            "JavaScript",
            "Python",
            "React",
            "Node.js",
            "TypeScript",
            "Next.js",
          ]),
        ],
        salary: faker.number.int({ min: 50000, max: 150000 }),
      },
      {
        headers: {
          Cookie: session.cookie,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create job:", error);
    throw error;
  }
}

async function createApplication(session: Session, jobId: string) {
  try {
    await axios.post(
      `${BASE_URL}/applications`,
      {
        jobId,
        coverLetter: faker.lorem.paragraphs(2),
        resume: faker.internet.url(),
      },
      {
        headers: {
          Cookie: session.cookie,
        },
      }
    );
  } catch (error) {
    console.error("Failed to create application:", error);
    // Don't throw, just continue
  }
}

async function searchJobs() {
  try {
    const searchTerms = ["engineer", "developer", "manager", "designer"];
    await axios.get(
      `${BASE_URL}/jobs?search=${faker.helpers.arrayElement(
        searchTerms
      )}&limit=10`
    );
  } catch (error) {
    console.error("Failed to search jobs:", error);
    // Don't throw, just continue
  }
}

async function viewJob(slug: string) {
  try {
    await axios.get(`${BASE_URL}/jobs/${slug}`);
  } catch (error) {
    console.error("Failed to view job:", error);
    // Don't throw, just continue
  }
}

async function generateTraffic() {
  console.log("Starting traffic generation...");
  const sessions: Session[] = [];
  const jobs: { id: string; slug: string }[] = [];

  // Create some initial users
  for (let i = 0; i < 5; i++) {
    try {
      const session = await createUser();
      sessions.push(session);
      console.log(`Created user ${i + 1}/5`);
    } catch (error) {
      console.error(`Failed to create user ${i + 1}:`, error);
    }
  }

  // Main traffic generation loop
  for (let i = 0; i < ITERATIONS; i++) {
    try {
      // Random actions
      const action = faker.number.int({ min: 1, max: 5 });
      const session = faker.helpers.arrayElement(sessions);

      switch (action) {
        case 1:
          // Create a new job
          const job = await createJob(session);
          jobs.push(job);
          console.log(`Created job ${jobs.length}`);
          break;

        case 2:
          // Create an application
          if (jobs.length > 0) {
            const randomJob = faker.helpers.arrayElement(jobs);
            await createApplication(session, randomJob.id);
            console.log(`Created application for job ${randomJob.id}`);
          }
          break;

        case 3:
          // Search for jobs
          await searchJobs();
          console.log("Performed job search");
          break;

        case 4:
          // View a job
          if (jobs.length > 0) {
            const randomJob = faker.helpers.arrayElement(jobs);
            await viewJob(randomJob.slug);
            console.log(`Viewed job ${randomJob.slug}`);
          }
          break;

        case 5:
          // Create a new user and session
          const newSession = await createUser();
          sessions.push(newSession);
          console.log("Created new user and session");
          break;
      }

      // Add some delay between requests
      await delay(DELAY_MS);
    } catch (error) {
      console.error(`Iteration ${i + 1} failed:`, error);
      continue;
    }
  }

  console.log("Traffic generation completed!");
}

// Run the traffic generator
generateTraffic().catch(console.error);
