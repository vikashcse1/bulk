import React, { Component } from "react";

import axios from "axios";
import csv from "csvtojson";
import * as cron from "node-cron";
import { toast } from "react-toastify";
import {
  Avatar,
  Button,
  CssBaseline,
  FormControl,
  FormLabel,
  Grid,
  InputBase,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@material-ui/core";
import { createStyles, withStyles, Theme } from "@material-ui/core/styles";
import { LockOutlined, MailOutlined, ListOutlined } from "@material-ui/icons";

import "react-toastify/dist/ReactToastify.min.css";

import FileEntry from "../components/FileEntry";

toast.configure();

const BootstrapInput = withStyles((theme: Theme) =>
  createStyles({
    root: {
      "label + &": {
        marginTop: theme.spacing(3),
      },
    },
    input: {
      borderRadius: 4,
      position: "relative",
      backgroundColor: theme.palette.background.paper,
      border: "1px solid #ced4da",
      fontSize: 16,
      padding: "10px 26px 10px 12px",
      transition: theme.transitions.create(["border-color", "box-shadow"]),
      // Use the system font instead of the default Roboto font.
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(","),
      "&:focus": {
        borderRadius: 4,
        borderColor: "#80bdff",
        boxShadow: "0 0 0 0.2rem rgba(0,123,255,.25)",
      },
    },
  })
)(InputBase);

const styles = {
  root: {
    height: "100vh",
  },
  image: {
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  avatar: {
    margin: "4px",
    marginTop: "1px",
    backgroundColor: "#2980b9",
    color: "#fff",
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: "8px",
  },
  submit: {
    margin: "24px 0px 16px",
  },
  button: {
    margin: "4px",
    width: "31%",
    textAlign: "center",
  } as React.CSSProperties,
  input: {
    display: "none",
  },
};

type Props = {};

type State = {
  user: string;
  pass: string;
  server: string;
  port: number;
  tls: boolean;
  subject: string;
  fromEmail: string;
  fromName: string;
  testRecepients: string[];
  bulkRecepients: string[];
  body: string;
  isHTML: boolean;
  limit: number;
  files: File[];
  selectedFiles: boolean[];
  sendAvailable: boolean;
  useSpaceKey: boolean;
  totalSentMails: number;
  spaceMode: boolean;
  disableButtons: boolean;
  cronExpression?: string;
};

export default class Home extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      user: "ewssoftwares@gmail.com",
      pass: "password",
      server: "smtp.gmail.com",
      port: 587,
      tls: false,
      subject: "EWS Software",
      fromEmail: "ewssoftwares@gmail.com",
      fromName: "EWS Software",
      testRecepients: ["ewssoftwares@gmail.com"],
      bulkRecepients: [],
      body: "Welcome to EWS Software.",
      isHTML: false,
      limit: 1,
      files: [],
      selectedFiles: [],
      sendAvailable: true,
      useSpaceKey: false,
      totalSentMails: 0,
      spaceMode: false,
      disableButtons: false,
      cronExpression: "",
    };
  }

  loadEmailsFromFile(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const content = reader.result;
          const array = await csv().fromString(content as string);
          let recepients: string[] = [];
          for (const item of array) {
            const emailAddress = item[Object.getOwnPropertyNames(item)[0]];
            recepients.push(emailAddress);
          }
          resolve(recepients);
        };
        reader.readAsBinaryString(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  async sendmail(to: string[], bulk?: boolean) {
    toast.dismiss();
    this.setState({
      sendAvailable: false,
    });
    const data = {
      host: this.state.server,
      port: this.state.port,
      secure: this.state.tls
        ? this.state.tls
        : this.state.port === 165
        ? true
        : false, // true for 465, false for other ports
      auth: {
        user: this.state.user,
        pass: this.state.pass,
      },
      from: `"${this.state.fromName}" <${this.state.fromEmail}>`,
      to,
      subject: this.state.subject,
      text: this.state.isHTML ? undefined : this.state.body,
      html: this.state.isHTML ? this.state.body : undefined,
      cronExpression: "",
      limit: this.state.limit,
    };
    let url = "";
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      url = "http://localhost:1234/send";
    } else {
      url = "/send";
    }
    if (bulk && this.state.cronExpression) {
      if (!cron.validate(this.state.cronExpression)) {
        toast("Invalid cron expression", { type: "error" });
        return;
      } else {
        data.cronExpression = this.state.cronExpression;
        data.to = to.concat(this.state.bulkRecepients) as any;
      }
    }
    let response: any = null;
    try {
      response = await axios.post(url, data);
    } catch (err) {
      response = err.response;
    } finally {
      const error = response.data.code;
      if (error) {
        toast.dismiss();
        toast(`An error has occured: ${error}`, {
          type: "error",
          autoClose: false,
        });
        this.setState({
          sendAvailable: true,
        });
        return;
      }
      if (this.state.cronExpression) {
        if (!response.data.error && response.data.id)
          toast(`Scheduled successfully! [${response.data.id}]`, {
            type: "info",
          });
        else {
          toast("Failed to schedule", { type: "error" });
          console.log(response.data);
        }

        this.setState({
          bulkRecepients: [],
        });
        return;
      }
      if (response.data!.length) {
        const accepted = response.data.reduce(
          (x: number, y: any) => x + y.accepted!.length,
          0
        );
        const rejected = response.data.reduce(
          (x: number, y: any) => x + y.rejected!.length,
          0
        );
        this.setState(
          (prevState) => {
            return {
              totalSentMails: prevState.totalSentMails + accepted,
            };
          },
          () => {
            toast.dismiss();
            toast(`${this.state.totalSentMails} emails were sent!`, {
              type: "info",
              autoClose: false,
            });
          }
        );
        if (rejected) {
          toast.dismiss();
          toast(`${rejected} emails were not sent!`, {
            type: "warning",
            autoClose: false,
          });
        }
      } else {
        toast.dismiss();
        toast("No emails were sent!", {
          type: "warning",
          autoClose: false,
        });
      }
      this.setState({
        sendAvailable: true,
      });
    }
  }

  test() {
    let { testRecepients } = this.state;
    if (!testRecepients.length) {
      toast(`No recipients defined`, { type: "error" });
      return;
    }
    this.sendmail([testRecepients[0]]);
  }

  bulk() {
    let { bulkRecepients, limit } = this.state;
    let remainingRecepients = bulkRecepients.splice(limit);
    this.setState(
      {
        bulkRecepients: remainingRecepients,
        useSpaceKey: this.state.spaceMode ? true : this.state.useSpaceKey,
      },
      () => {
        if (!bulkRecepients.length) {
          toast(`No recipients defined`, { type: "error" });
          return;
        }

        this.sendmail(bulkRecepients, true);
      }
    );
    this.test();
  }

  render() {
    return (
      <div>
        <Grid container component="main" style={styles.root}>
          <CssBaseline />
          <Grid item xs={12} sm={8} md={3} style={styles.image}>
            <div
              style={{
                margin: "64px 32px",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <Avatar style={styles.avatar}>
                <LockOutlined />
              </Avatar>
              <Typography component="h1" variant="h5">
                SMTP Credentials
              </Typography>
              <div style={styles.form}>
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.server}
                  id="server"
                  label="Server"
                  name="server"
                  autoFocus
                  onChange={(event) => {
                    this.setState({
                      server: event.target.value,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.port.toString()}
                  name="port"
                  label="Port"
                  type="number"
                  id="port"
                  onChange={(event) => {
                    this.setState({
                      port: parseInt(event.target.value),
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.user}
                  id="email"
                  label="User"
                  name="email"
                  autoComplete="email"
                  onChange={(event) => {
                    this.setState({
                      user: event.target.value,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.pass}
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  onChange={(event) => {
                    this.setState({
                      pass: event.target.value,
                    });
                  }}
                />
                <FormLabel
                  style={{ float: "left", marginTop: "3%" }}
                  component="legend"
                >
                  TLS
                </FormLabel>
                <FormControl style={{ float: "right", width: "100%" }}>
                  <Select
                    value={this.state.tls ? 1 : 0}
                    onChange={(event) => {
                      this.setState({
                        tls:
                          parseInt(event.target.value as string) === 1
                            ? true
                            : false,
                      });
                    }}
                    input={<BootstrapInput name="tls" id="tls" />}
                  >
                    <MenuItem value={0}>No</MenuItem>
                    <MenuItem value={1}>Yes</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>
          </Grid>
          <Grid item xs={false} sm={4} md={5} component={Paper}>
            <div
              style={{
                margin: "64px 32px",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
              tabIndex={this.state.useSpaceKey ? 0 : undefined}
              onKeyDown={(event) => {
                if (event.keyCode === 32 && this.state.useSpaceKey) {
                  this.bulk();
                }
              }}
            >
              <Avatar style={styles.avatar}>
                <MailOutlined />
              </Avatar>
              <Typography component="h1" variant="h5">
                Mail Details
              </Typography>
              <div style={styles.form}>
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.subject}
                  id="subject"
                  label="Subject"
                  name="subject"
                  onChange={(event) => {
                    this.setState({
                      subject: event.target.value,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.fromEmail}
                  name="from_email"
                  label="From (Email)"
                  id="from_email"
                  onChange={(event) => {
                    this.setState({
                      fromEmail: event.target.value,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.fromName}
                  name="from_name"
                  label="From (Name)"
                  id="from_name"
                  onChange={(event) => {
                    this.setState({
                      fromName: event.target.value,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  value={this.state.testRecepients.join("\n")}
                  name="recepients"
                  label="Recepients"
                  id="recepients"
                  multiline
                  rows={6}
                  onKeyPress={(event) => {
                    if (event.key === "Enter") {
                      // eslint-disable-next-line
                      const email_re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                      let testRecepients = this.state.testRecepients;
                      testRecepients = testRecepients.filter((x) =>
                        x.match(email_re)
                      );
                      this.setState({
                        testRecepients,
                      });
                    }
                  }}
                  onChange={(event) => {
                    let recepients = event.target.value.split("\n");
                    this.setState({
                      testRecepients: recepients,
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.body}
                  name="body"
                  label="Body"
                  id="body"
                  multiline
                  rows={8}
                  onChange={(event) => {
                    this.setState({
                      body: event.target.value,
                    });
                  }}
                />
                <FormLabel
                  style={{ float: "left", marginTop: "3%" }}
                  component="legend"
                >
                  HTML
                </FormLabel>
                <FormControl style={{ float: "right", width: "100%" }}>
                  <Select
                    value={this.state.isHTML ? 1 : 0}
                    onChange={(event) => {
                      this.setState({
                        isHTML:
                          parseInt(event.target.value as string) === 1
                            ? true
                            : false,
                      });
                    }}
                    input={<BootstrapInput name="isHTML" id="isHTML" />}
                  >
                    <MenuItem value={0}>No</MenuItem>
                    <MenuItem value={1}>Yes</MenuItem>
                  </Select>
                </FormControl>
                <FormLabel
                  style={{ float: "left", marginTop: "3%" }}
                  component="legend"
                >
                  Space Mode
                </FormLabel>
                <FormControl style={{ float: "right", width: "100%" }}>
                  <Select
                    value={this.state.spaceMode ? 1 : 0}
                    onChange={(event) => {
                      this.setState({
                        spaceMode:
                          parseInt(event.target.value as string) === 1
                            ? true
                            : false,
                      });
                    }}
                    input={<BootstrapInput name="spaceMode" id="spaceMode" />}
                  >
                    <MenuItem value={0}>No</MenuItem>
                    <MenuItem value={1}>Yes</MenuItem>
                  </Select>
                </FormControl>
                <FormLabel
                  style={{ float: "left", marginTop: "3%" }}
                  component="legend"
                >
                  Disable Buttons
                </FormLabel>
                <FormControl style={{ float: "right", width: "100%" }}>
                  <Select
                    value={this.state.disableButtons ? 1 : 0}
                    onChange={(event) => {
                      this.setState({
                        disableButtons:
                          parseInt(event.target.value as string) === 1
                            ? true
                            : false,
                      });
                    }}
                    input={
                      <BootstrapInput
                        name="disableButtons"
                        id="disableButtons"
                      />
                    }
                  >
                    <MenuItem value={0}>No</MenuItem>
                    <MenuItem value={1}>Yes</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.limit.toString()}
                  name="limit"
                  label="Limit (max 25000)"
                  type="number"
                  id="limit"
                  onChange={(event) => {
                    this.setState({
                      limit: parseInt(event.target.value),
                    });
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  value={this.state.cronExpression}
                  name="cron-expression"
                  label="Cron Expression"
                  type="text"
                  id="limit"
                  onChange={(event) => {
                    this.setState({
                      cronExpression: event.target.value,
                    });
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-evenly",
                  }}
                >
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    style={{
                      margin: "24px 0px 16px",
                      width: "30%",
                    }}
                    onClick={this.test.bind(this)}
                    disabled={
                      this.state.disableButtons && !this.state.sendAvailable
                    }
                  >
                    Test
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    style={{
                      margin: "24px 0px 16px",
                      width: "30%",
                    }}
                    onClick={() => {
                      this.bulk();
                    }}
                    disabled={
                      this.state.disableButtons && !this.state.sendAvailable
                    }
                  >
                    {this.state.cronExpression ? "Schedule" : "Bulk"}
                  </Button>
                </div>
              </div>
            </div>
          </Grid>
          <Grid item xs={12} sm={8} md={4} style={styles.image}>
            <div
              style={{
                margin: "64px 32px",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <Avatar style={styles.avatar}>
                <ListOutlined />
              </Avatar>
              <Typography component="h1" variant="h5">
                Address List
              </Typography>
              <div style={styles.form}>
                <input
                  accept="text/csv"
                  style={{ display: "none" }}
                  id="file-chooser"
                  type="file"
                  multiple
                  onChange={(event) => {
                    let { files, selectedFiles } = this.state;
                    files = files.concat(Array.from(event.target.files!));
                    for (let i = 0; i < files.length; i++) {
                      selectedFiles.push(true);
                    }
                    this.setState({
                      files,
                      selectedFiles,
                    });
                  }}
                />
                <label htmlFor="file-chooser">
                  <Button
                    variant="contained"
                    component="span"
                    style={styles.button}
                  >
                    Choose
                  </Button>
                </label>
                <label>
                  <Button
                    variant="contained"
                    component="span"
                    style={styles.button}
                    onClick={async () => {
                      let bulkRecepients = [];
                      let numLoadedFiles = 0,
                        numLoadedEmails = 0;
                      for (let i = 0; i < this.state.files.length; i++) {
                        const file = this.state.files[i];
                        if (this.state.selectedFiles[i]) {
                          const recepientsInFile = await this.loadEmailsFromFile(
                            file
                          );
                          for (const recepientInFile of recepientsInFile) {
                            bulkRecepients.push(recepientInFile);
                            numLoadedEmails++;
                          }
                          numLoadedFiles++;
                        }
                      }
                      // eslint-disable-next-line
                      const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                      bulkRecepients = bulkRecepients.filter(
                        (x) => x && x.match(re)
                      );
                      toast.dismiss();
                      toast(
                        `Loaded ${numLoadedEmails} email addresses from ${numLoadedFiles} ${
                          numLoadedFiles === 1 ? "file" : "files"
                        }`,
                        { type: "success" }
                      );
                      this.setState({
                        bulkRecepients,
                      });
                    }}
                  >
                    Load
                  </Button>
                </label>
                <label>
                  <Button
                    variant="contained"
                    component="span"
                    style={styles.button}
                    onClick={() => {
                      const hasSelectedSomething = this.state.selectedFiles.some(
                        (x) => !!x
                      );
                      if (!hasSelectedSomething) {
                        toast.dismiss();
                        toast("You must select at least one file to delete!", {
                          type: "error",
                        });
                      } else {
                        let { files, selectedFiles } = this.state,
                          newFiles = [],
                          newSelectedFiles = [];
                        for (let i = 0; i < selectedFiles.length; i++) {
                          const selectedFile = selectedFiles[i];
                          if (!selectedFile) {
                            newFiles.push(files[i]);
                            newSelectedFiles.push(selectedFiles[i]);
                          }
                        }
                        this.setState({
                          files: newFiles,
                          selectedFiles: newSelectedFiles,
                        });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </label>
                {this.state.files.map((file, index) => (
                  <FileEntry
                    file={file}
                    key={index}
                    index={index}
                    checked={this.state.selectedFiles[index]}
                    onChange={() => {
                      let { selectedFiles } = this.state;
                      selectedFiles[index] = !selectedFiles[index];
                      this.setState({
                        selectedFiles,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </Grid>
        </Grid>
      </div>
    );
  }
}
