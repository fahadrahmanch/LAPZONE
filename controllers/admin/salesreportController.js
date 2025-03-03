const orderSchema = require("../../models/orderSchema");
const PDFDocument = require("pdfkit-table");

const ExcelJS = require("exceljs");
const fs = require("fs");
const { STATUS_CODES } = require("http");
const { MESSAGES } = require("../../utils/constants");

// SALES REPORT PAGE RENDER

const getSalesreport = async (req, res) => {
  try {
    const admin = req.session.admin;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const period = req.query.period || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    req.session.dateErr = "";

    let filterQuery = { status: "Delivered" };

    if (period !== "all") {
      let start, end;
      const today = new Date();

      switch (period) {
        case "daily":
          start = new Date();
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;

        case "weekly":
          start = new Date(today);
          start.setDate(today.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;

        case "monthly":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;

        case "custom":
          if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (start > today || end > today) {
              req.session.dateErr = '"Future dates are not allowed."';
            }

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }

      if (start && end) {
        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];

        filterQuery.createdOn = { $gte: startStr, $lte: endStr };
      }
    }

    const orders = await orderSchema
      .find(filterQuery)
      .populate("userId")
      .populate({
        path: "orderedItems.Product",
        model: "Product",
      })
      .skip(skip)
      .limit(limit)
      .lean();

    const salesCount = await orderSchema.countDocuments(filterQuery);
    const totalPages = Math.ceil(salesCount / limit);

    const totals = await orderSchema.aggregate([
      { $match: filterQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$finalAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discount", 0] } },
        },
      },
    ]);

    const overallamount = totals.length > 0 ? totals[0].totalAmount : 0;
    const overallDiscount = totals.length > 0 ? totals[0].totalDiscount : 0;

    return res.render("admin/salesreport", {
      overallamount,
      overallDiscount,
      orders,
      count: salesCount,
      period: "all",
      currentPage: page,
      totalPages,
      period,
      dateErr: req.session.dateErr,
      startDate,
      endDate,
    });
  } catch (error) {
    console.log(error);
  }
};

// DOWNLOAD EXCEL

const downloadExcel = async (req, res) => {
  try {
    const filterQuery = { status: "Delivered" };
    const period = req.query.period || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    if (period !== "all") {
      let start, end;
      const today = new Date();

      switch (period) {
        case "daily":
          start = new Date();
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;

        case "weekly":
          start = new Date(today);
          start.setDate(today.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;

        case "monthly":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;

        case "custom":
          if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }

      if (start && end) {
        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];

        filterQuery.createdOn = { $gte: startStr, $lte: endStr };
      }
    }
    const orders = await orderSchema
      .find(filterQuery)
      .populate("userId")
      .populate({
        path: "orderedItems.Product",
        model: "Product",
      })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Date", key: "createdOn", width: 15 },
      { header: "Customer", key: "customer", width: 20 },
      { header: "Products", key: "products", width: 30 },
      { header: "Payment", key: "paymentMethod", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Amount", key: "finalAmount", width: 15 },
    ];
    orders.forEach((order) => {
      const createdOnDate = new Date(order.createdOn);
      worksheet.addRow({
        orderId: order.orderId,
        createdOn: createdOnDate.toLocaleDateString(),
        customer: order.userId.name,
        products: order.orderedItems
          .map((item) => item.Product.productName)
          .join(", "),
        paymentMethod: order.paymentMethod,
        status: order.status,
        finalAmount: order.finalAmount,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).send("Error generating Excel");
  }
};

//DOWNLOAD PDF

const downloadPDF = async (req, res) => {
  try {
    const filterQuery = { status: "Delivered" };
    const period = req.query.period || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (period !== "all") {
      let start, end;
      const today = new Date();

      switch (period) {
        case "daily":
          start = new Date();
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          start = new Date(today);
          start.setDate(today.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;
        case "monthly":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case "custom":
          if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }

      if (start && end) {
        filterQuery.createdOn = { $gte: start, $lte: end };
      }
    }

    const orders = await orderSchema
      .find(filterQuery)
      .populate("userId")
      .populate({
        path: "orderedItems.Product",
        model: "Product",
      })
      .lean();

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );
    doc.pipe(res);

    // Title
    doc.fontSize(16).text("Sales Report", { align: "center", underline: true });
    doc.moveDown(2);

    // Table data
    const table = {
      headers: ["Date", "Customer", "Products", "Payment", "Status", "Amount"],
      rows: orders.map((order) => [
        // order.orderId,
        new Date(order.createdOn).toISOString().split("T")[0],
        order.userId.name,
        order.orderedItems.map((item) => item.Product.productName).join(", "),
        order.paymentMethod,
        order.status,
        `$${order.finalAmount}`,
      ]),
    };

    // Add table to PDF
    await doc.table(table, {
      prepareHeader: () => doc.fontSize(10).font("Helvetica-Bold"),
      prepareRow: () => doc.fontSize(10).font("Helvetica"),
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES).send(MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getSalesreport, downloadExcel, downloadPDF };
