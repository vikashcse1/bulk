import React, { Component } from "react";
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@material-ui/core";

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  actions: any;
};

export default class Modal extends Component {
  props: Props;
  handleClose() {}
  handleClickOpen() {}

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  render() {
    return (
      <div>
        <Dialog
          open={this.props.isOpen}
          onClose={this.handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{this.props.title}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {this.props.description}
            </DialogContentText>
          </DialogContent>
          {this.props.actions}
        </Dialog>{" "}
      </div>
    );
  }
}
