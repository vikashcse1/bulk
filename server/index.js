const blessed = require("blessed");
const bodyParser = require("body-parser");
const cors = require("cors");
const crc = require("crc");
const cron = require("node-cron");
const dotenv = require("dotenv");
const express = require("express");
const moment = require("moment");
const nodemailer = require("nodemailer");
const Table = require("cli-table3");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 1234;
const server = require("http").Server(app);
let schedules = [];

const screen = blessed.screen({ smartCSR: true, fullUnicode: true });
const output = blessed.log({
  top: 0,
  left: 0,
  height: "100%-3",
  width: "100%",
  keys: true,
  mouse: true,
  scrollable: true,
  scrollbar: {
    ch: " ",
  },
  border: {
    type: "line",
  },
  label: " Log ",
});
let input = blessed.textbox({
  bottom: 0,
  left: 0,
  height: 3,
  width: "100%",
  keys: true,
  mouse: true,
  inputOnFocus: true,
  style: {
    fg: "white",
  },
  border: {
    type: "line",
  },
  label: " Input ",
});

screen.key(["escape", "C-c"], () => process.exit(0));
screen.key(["enter"], () => input.focus());
screen.append(output);
screen.append(input);

input.on("submit", (text) => {
  output.log(text);
  output.popLine(1);
  const args = text.split(" ");
  const command = args.shift();
  switch (command) {
    case "help":
      output.log("Available commands:");
      output.log("help - Lists available commands");
      output.log("list - Lists current schedules");
      output.log("remove {id} - Removes the schedule that's id is {id}");
      output.log("removeall - Removes all of the schedules");
      output.log("pause {id} - Pauses the schedule that's id is {id}");
      output.log("pauseall - Pauses all of the running schedules");
      output.log("resume {id} - Resumes the schedule that's id is {id}");
      output.log("resumeall - Resumes all of the paused schedules");
      break;
    case "list":
      if (!schedules.length) {
        output.log("There are no active schedules.");
        break;
      }
      output.log("Active schedules:");
      const table = new Table({
        head: [
          "ID",
          "Cron Expression",
          "Scheduled At",
          "Limit",
          "Remaining Recipients",
          "Status",
        ],
      });
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        table.push([
          schedule.properties.id,
          schedule.properties.cronExpression,
          moment(schedule.properties.time).format("DD/MM/YYYY hh:mm:ss A"),
          `${schedule.properties.limit}`,
          `${schedule.properties.recipients}`,
          schedule.schedule.getStatus() === "stoped" ? "Paused" : "Running",
        ]);
      }
      output.log(table.toString());
      break;
    case "remove":
      const idtoRemove = args[0];
      const indexToRemove = schedules.findIndex(
        (x) => x.properties.id === idtoRemove
      );
      if (indexToRemove < 0) {
        output.log("Schedule not found, make sure you typed the ID correctly!");
        break;
      }
      const scheduleToBeDeleted = schedules[indexToRemove];
      scheduleToBeDeleted.schedule.stop();
      scheduleToBeDeleted.schedule.destroy();

      const deletedScheduleTable = new Table({
        head: [
          "ID",
          "Cron Expression",
          "Scheduled At",
          "Limit",
          "Remaining Recipients",
          "Status",
        ],
      });
      deletedScheduleTable.push([
        scheduleToBeDeleted.properties.id,
        scheduleToBeDeleted.properties.cronExpression,
        moment(scheduleToBeDeleted.properties.time).format(
          "DD/MM/YYYY hh:mm:ss A"
        ),
        `${scheduleToBeDeleted.properties.limit}`,
        `${scheduleToBeDeleted.properties.recipients}`,
        "Removed",
      ]);

      schedules.splice(indexToRemove, 1);
      output.log("Deleted schedule:");
      output.log(deletedScheduleTable.toString());
      break;
    case "removeall":
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        schedule.schedule.stop();
        schedule.schedule.destroy();
      }
      schedules = [];
      output.log("Removed all of the schedules!");
      break;
    case "pause":
      const idToPause = args[0];
      const indexToPause = schedules.findIndex(
        (x) => x.properties.id === idToPause
      );
      if (indexToPause < 0) {
        output.log("Schedule not found, make sure you typed the ID correctly!");
        break;
      }
      const scheduleToBePaused = schedules[indexToPause];

      const pausedScheduleTable = new Table({
        head: [
          "ID",
          "Cron Expression",
          "Scheduled At",
          "Limit",
          "Remaining Recipients",
          "Status",
        ],
      });
      pausedScheduleTable.push([
        scheduleToBePaused.properties.id,
        scheduleToBePaused.properties.cronExpression,
        moment(scheduleToBePaused.properties.time).format(
          "DD/MM/YYYY hh:mm:ss A"
        ),
        `${scheduleToBePaused.properties.limit}`,
        `${scheduleToBePaused.properties.recipients}`,
        "Paused",
      ]);

      scheduleToBePaused.schedule.stop();
      output.log("Paused schedule:");
      output.log(pausedScheduleTable.toString());
      break;
    case "pauseall":
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        if (schedule.schedule.getStatus() !== "stoped")
          schedule.schedule.stop();
      }
      output.log("Paused all of the running schedules!");
      break;
    case "resume":
      const idToResume = args[0];
      const indexToResume = schedules.findIndex(
        (x) => x.properties.id === idToResume
      );
      if (indexToResume < 0) {
        output.log("Schedule not found, make sure you typed the ID correctly!");
        break;
      }
      const scheduleToBeResumed = schedules[indexToResume];

      const resumedScheduleTable = new Table({
        head: [
          "ID",
          "Cron Expression",
          "Scheduled At",
          "Limit",
          "Remaining Recipients",
          "Status",
        ],
      });
      resumedScheduleTable.push([
        scheduleToBeResumed.properties.id,
        scheduleToBeResumed.properties.cronExpression,
        moment(scheduleToBeResumed.properties.time).format(
          "DD/MM/YYYY hh:mm:ss A"
        ),
        `${scheduleToBeResumed.properties.limit}`,
        `${scheduleToBeResumed.properties.recipients}`,
        "Running",
      ]);

      scheduleToBeResumed.schedule.start();
      output.log("Resumed schedule:");
      output.log(resumedScheduleTable.toString());
      break;
    case "resumeall":
      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        if (schedule.schedule.getStatus() === "stoped")
          schedule.schedule.start();
      }
      output.log("Resumed all of the paused schedules!");
      break;
    default:
      break;
  }
  output.log("");
  input.clearValue();
  input.focus();
});

input.focus();

const sendMail = async (
  host,
  port,
  secure,
  auth,
  from,
  to,
  subject,
  text,
  html
) => {
  const responses = [];
  if (!Array.isArray(to)) to = [to];
  for (const participant of to) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });
    const response = await transporter.sendMail({
      from,
      to: participant,
      subject,
      text,
      html,
    });
    responses.push(response);
  }
  return responses;
};

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
app.use("/", express.static("build"));

app.post("/send", async (req, res) => {
  let response = null;
  try {
    const {
      host,
      port,
      secure,
      auth,
      from,
      to,
      subject,
      text,
      html,
      cronExpression,
      limit,
    } = req.body;
    if (cronExpression) {
      if (!cron.validate(cronExpression)) {
        res.status(400).send({ error: "Invalid cron expression" });
        return;
      }
      const date = new Date();
      const scheduleObject = {
        properties: {
          time: date,
          cronExpression,
          limit,
          recipients: to.length,
          id: crc.crc32(date.getTime().toString()).toString(16),
        },
      };
      const schedule = cron.schedule(cronExpression, async () => {
        try {
          if (!to.length) {
            schedule.stop();
            schedule.destroy();
            schedules.splice(schedules.indexOf(scheduleObject), 1);
            return;
          }
          const currentTo = to.splice(0, limit);
          await sendMail(
            host,
            port,
            secure,
            auth,
            from,
            currentTo,
            subject,
            text,
            html
          );
          scheduleObject.properties.recipients = to.length;
          if (!to.length) {
            schedules.splice(schedules.indexOf(scheduleObject), 1);
            schedule.stop();
            schedule.destroy();
          }
        } catch (err) {
          output.log(err.message || err);
        }
      });
      scheduleObject.schedule = schedule;
      schedule.start();
      schedules.push(scheduleObject);
      res.status(200).json({ error: false, id: scheduleObject.properties.id });
    } else {
      response = await sendMail(
        host,
        port,
        secure,
        auth,
        from,
        to,
        subject,
        text,
        html
      );
    }
  } catch (err) {
    output.log(err.message || err);
    response = err;
  }
  if (!res.headersSent) {
    res.send(response);
  }
});

screen.render();
server.listen(3000, () => {
  output.log("Server started on", PORT + "!");
});
