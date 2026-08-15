export type VerificationJob = { verificationId: string; datasetVersionId: string };

export interface VerificationJobQueue {
  enqueue(job: VerificationJob): Promise<void>;
  consume(handler: (job: VerificationJob) => Promise<void>): Promise<void>;
}

export class InMemoryVerificationQueue implements VerificationJobQueue {
  private readonly jobs: VerificationJob[] = [];
  private consuming = false;

  async enqueue(job: VerificationJob): Promise<void> {
    this.jobs.push(job);
  }

  async consume(handler: (job: VerificationJob) => Promise<void>): Promise<void> {
    if (this.consuming) throw new Error("Queue consumer already running");
    this.consuming = true;
    try {
      while (this.jobs.length > 0) {
        const job = this.jobs.shift();
        if (job) await handler(job);
      }
    } finally {
      this.consuming = false;
    }
  }
}
