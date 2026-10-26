const request = require("supertest");
const app = require("../app/server");

beforeEach(() => {
    app.locals.reset();
});

describe("health & metrics", () => {
    test("GET /health mengembalikan status ok", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    test("GET /metrics mengembalikan format Prometheus", async () => {
        const res = await request(app).get("/metrics");
        expect(res.status).toBe(200);
        expect(res.text).toContain("task_created_total");
        expect(res.text).toContain("process_cpu_seconds_total");
    });
});

describe("tasks API", () => {
    test("daftar awal kosong", async () => {
        const res = await request(app).get("/api/tasks");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test("POST menambah tugas", async () => {
        const res = await request(app).post("/api/tasks").send({ title: "Belajar Docker" });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: 1, title: "Belajar Docker", done: false });

        const list = await request(app).get("/api/tasks");
        expect(list.body).toHaveLength(1);
    });

    test("POST tanpa title ditolak", async () => {
        const res = await request(app).post("/api/tasks").send({ title: "  " });
        expect(res.status).toBe(400);
    });

    test("PATCH mengubah status selesai", async () => {
        await request(app).post("/api/tasks").send({ title: "Tes" });
        const res = await request(app).patch("/api/tasks/1");
        expect(res.status).toBe(200);
        expect(res.body.done).toBe(true);
    });

    test("PATCH id tidak ada mengembalikan 404", async () => {
        const res = await request(app).patch("/api/tasks/99");
        expect(res.status).toBe(404);
    });

    test("DELETE menghapus tugas ", async () => {
        await request(app).post("/api/tasks").send({ title: "Hapus aku" });
        const res = await request(app).delete("/api/tasks/1");
        expect(res.status).toBe(204);
        const list = await request(app).get("/api/tasks");
        expect(list.body).toHaveLength(0);
    });

    test("DELETE id tidak ada mengembalikan 404", async () => {
        const res = await request(app).delete("/api/tasks/99");
        expect(res.status).toBe(404);
    });
});
