const PDFDocument = require("pdfkit");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// This function will generate a PDF buffer for a given booking
const generateInvoicePDF = async booking => {
  // Create a new PDF Document
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // We'll gather our PDF in a Buffer
  let buffers = [];
  doc.on("data", chunk => {
    buffers.push(chunk);
  });

  // Wrap PDF generation in a Promise so we can "await" it
  const pdfReadyPromise = new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on("error", err => {
      reject(err);
    });
  });

  // 1) Add your PDF text and layout here:
  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();
  doc
    .fontSize(14)
    .text(`Invoice for Booking ID: ${booking.id}`, { align: "left" });
  doc.text(`Tour: ${booking.tour.name}`);
  doc.text(`User: ${booking.user.name} <${booking.user.email}>`);
  doc.text(`Date Booked: ${new Date(booking.createdAt).toLocaleDateString()}`);
  doc.text(
    `Tour Start Date: ${new Date(booking.startDate).toLocaleDateString()}`,
  );
  doc.text(`Participants: ${booking.numParticipants}`);
  doc.text(`Price: $${booking.price.toFixed(2)}`);
  doc.moveDown();

  // 2) (Optional) Add any additional fields or styling
  // e.g., doc.text(`Some extra info here...`);

  // 3) Finalize the PDF
  doc.end();

  // 4) Wait for PDF to be fully created and return it
  const pdfBuffer = await pdfReadyPromise;
  return pdfBuffer;
};

// Main controller to handle invoice download
exports.downloadInvoice = catchAsync(async (req, res, next) => {
  const { transactionId } = req.params;

  // 1) Find the corresponding booking
  const booking = await Booking.findById(transactionId).populate("tour user");
  if (!booking) {
    return next(new AppError("Transaction not found.", 404));
  }

  // 2) Ensure the currently logged-in user is the owner (or an admin)
  //    i.e., booking.user.id === req.user.id, or user.role === 'admin'
  if (booking.user.id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to access this invoice.", 403),
    );
  }

  // 3) Generate the PDF using our helper function
  const invoiceBuffer = await generateInvoicePDF(booking);

  // 4) Send the PDF as a downloadable file
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${transactionId}.pdf`,
  );

  // If you want to stream the file:
  // return res.end(invoiceBuffer);
  // or just res.send() also works

  return res.send(invoiceBuffer);
});
