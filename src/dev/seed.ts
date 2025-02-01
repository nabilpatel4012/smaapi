import { faker } from "@faker-js/faker";
import { setupDB } from "../db/index";
import { config } from "../config";
import { createUser } from "../modules/user/user.service";
import { createJob } from "../modules/job/job.service";

async function main() {
  const { db, client } = await setupDB(config.DATABASE_URL);

  const keywords = [
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "TypeScript",
    "Next.js",
  ];

  const users = await Promise.all(
    Array.from({ length: 100 }, () =>
      createUser(
        {
          email: faker.internet.email(),
          password: faker.internet.password(),
        },
        db
      )
    )
  );

  const userIds = users.map((user) => user.id);

  await Promise.all(
    Array.from({ length: 10000 }, () => {
      const title = faker.person.jobTitle();
      return createJob(
        {
          title,
          description: faker.lorem.paragraph(3),
          keywords: [faker.helpers.arrayElement(keywords)],
          userId: faker.helpers.arrayElement(userIds),
        },
        db
      );
    })
  );

  await client.end();

  process.exit(0);
}

main();
