const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequestSchema");
const User = require("../models/user");

const requestRouter = express.Router();

requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;
      if (fromUserId == toUserId)
        return res
          .status(400)
          .json({ message: "Cannot send request to self!" });
      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid status type : " + status });
      }
      const toUser = await User.findById({ _id: toUserId });
      if (!toUser) {
        return res
          .status(404)
          .json({ message: "toUser not found! : " + toUserId });
      }
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (existingConnectionRequest)
        return res
          .status(400)
          .json({ message: "Connection request already exists!" });

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });
      const data = await connectionRequest.save();
      res.json({
        message:
          req.user.firstName + " is " + status + " in " + toUser.firstName,
        data,
      });
    } catch (error) {
      res.status(400).send("Error : " + error.message);
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status))
        return res.status(400).json({ message: "Invalid status " + status });
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!connectionRequest)
        res.status(404).json({ message: "Request not found!" });
      connectionRequest.status = status;
      const data = await connectionRequest.save();
      res.json({ message: "Connection request : " + status, data });
    } catch (error) {
      res.status(400).send("Error : "+ error.message);
    }
  }
);

module.exports = requestRouter;
