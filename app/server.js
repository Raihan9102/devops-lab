const path = require("path");
const express = require("express");
const client = require("prom-client");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --------- Metrics Prometheus ---------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequest = new client.Counter({
    name: "http_requests_total",
    help: "Jumlah request HTTP",
    labelNames: ["method", "route", "status"],
    registers: [register],
});

const httpDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Durasi request HTTP dalam detik",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 3],
    registers: [register],
});

const tasksCreated = new client.Counter({
    name: "task_created_total",
    help: "Jumlah task yang pernah dibuat",
    registers: [register],
})

const tasksGauge = new client.Gauge({
    name: "tasks_current",
    help: "Jumlah tugas saat ini",
    registers: [register],
    collect() {
        this.set(tasks.length);
    },
})

app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on("finish", () => {
        const route = req.route ? req.baseUrl + req.route.path : req.path;
        if (route === "/metrics") return;
        const labels = { method: req.method, route, status: res.statusCode };
        httpRequest.inc(labels);
        end(labels);
    });
    next();
});

// --------- Data In-memory ---------
let tasks = [];
let nextId = 1;

// --------- Routes ----------
app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

app.get("/api/tasks", (req, res) => {
    res.json(tasks);
})

app.post("/api/tasks", (req, res) => {
    const title = (req.body && typeof req.body.title === "string" ? req.body.title : "").trim();
    if (!title) {
        return res.status(400).json({ error: "Title wajib diisi" });
    }
    const task = { id: nextId++, title, done: false };
    tasks.push(task);
    tasksCreated.inc();
    res.status(201).json(task);
});

app.patch("/api/tasks/:id/", (req, res) => {
    const task = tasks.find((t) => t.id === Number(req.params.id));
    if (!task) {
        return res.status(404).json({ error: "Task tidak ditemukan" });
    }
    task.done = !task.done;
    res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
    const before = tasks.length;
    tasks = tasks.filter(t => t.id !== Number(req.params.id));
    if (tasks.length === before) {
        return res.status(404).json({ error: "Tugas tidak ditemukan" });
    }
    res.status(204).send();
});

//Helper untuk test: reset data
app.locals.reset = () => {
    tasks = [];
    nextId = 1;
};

// ------- Start ------
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`devops-lab berjalan di http://localhost:${PORT}`);
    });
    process.on("SIGTERM", () => {
        console.log("SIGTERM diterima, Mematikan Server...");
        server.close(() => process.exit(0));
    });
}
module.exports = app;
