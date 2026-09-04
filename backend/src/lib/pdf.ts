import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function renderLetter(title: string, lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  page.drawText(title, { x: 50, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 40;

  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 22;
  }

  return Buffer.from(await doc.save());
}

export async function renderAdmissionLetter(input: {
  studentName: string;
  className: string;
  idNumber: string;
}): Promise<Buffer> {
  return renderLetter("Letter of Admission", [
    `Student: ${input.studentName}`,
    `Class: ${input.className}`,
    `Student ID number: ${input.idNumber}`,
    "",
    "Congratulations — your admission has been approved.",
  ]);
}

export async function renderEmploymentLetter(input: {
  staffName: string;
  role: string;
  idNumber: string;
}): Promise<Buffer> {
  return renderLetter("Letter of Employment", [
    `Name: ${input.staffName}`,
    `Role: ${input.role}`,
    `Staff ID number: ${input.idNumber}`,
    "",
    "Welcome to the team.",
  ]);
}
