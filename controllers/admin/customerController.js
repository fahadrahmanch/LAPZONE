const User = require("../../models/userSchema");
const { MESSAGES, STATUS_CODES, ERROR } = require("../../utils/constants");

// CUSTOMER PAGE RENDER

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 6;
    const data = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const currentPage = page;
    res.render("admin/userlist", { data, totalPages, currentPage });
  } catch (error) {}
};

// BLOCK AND UNBLOCK

const block = async (req, res) => {
  try {
    const { id, action } = req.body;
    if (!id || !action) {
      return res
        .status(400)
        .json({ message: MESSAGES.USER_ID_ACTION_REQUIRED });
    }
    const user = await User.findById(id);
    user.isBlocked = action === "block";
    await user.save();
    const status = action === "block" ? "blocked" : "unblocked";
    res.status(STATUS_CODES.OK).json({ message: MESSAGES.USER_STATUS_UPDATED });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
module.exports = { customerInfo, block };
