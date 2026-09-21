import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pagesData = [
    {
      pageNumber: 1,
      header: "BOOK IV — THE INNER CITADEL",
      title: "1. The Sanctuary of the Mind",
      paragraphs: [
        "People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind, especially if he has inside him the kind of thoughts that, if he regards them closely, immediately produce a state of perfect calm.",
        "By calm I mean nothing other than good order. Constantly grant yourself this retreat, and renew yourself. Let your basic principles be brief and fundamental, the kind that will at once, as soon as you recall them, wash away all vexation, and send you back without resentment to the life you have to accept.",
        "For what is it that irritates you? The wickedness of humanity? Remind yourself of the conclusion that rational beings are born for one another, that patience is a part of justice, and that wrongdoings are not intentional.",
        "Consider how many people, after spending their lives in enmity, suspicion, hatred, and warfare, have ended in the grave and ashes. Be calm, then."
      ],
      quote: "\"Nowhere can man find a quieter or more untroubled retreat than in his own soul.\"",
      footer: "Meditations by Marcus Aurelius — Book IV, Section 3"
    },
    {
      pageNumber: 2,
      header: "BOOK IV — ON FAME AND TIME",
      title: "2. The Mirage of Posterity",
      paragraphs: [
        "Or does the thing men call fame distract you? Look at the swiftness with which all things are forgotten, look at the abyss of infinite time on either side, look at the emptiness of applause, the fickleness and lack of judgment in those who pretend to praise you, and the narrow limits of the place in which your renown is confined.",
        "For the whole earth is a point in space, and how small a corner of it is this your dwelling, and how few are those who will sing your praises, and what kind of men are they?",
        "Keep in mind, then, this retreat into your own small domain, and above all do not distract or strain yourself, but be free, and look upon things as a human being, as an individual, as a citizen, and as a mortal creature.",
        "Among the most immediate truths you can turn to are these two: first, that things cannot touch the mind, but stand motionless outside it, while disturbances arise solely from within, from our own opinions; and second, that all you see will change in an instant and be no more."
      ],
      quote: "\"The world is mere change, and life is opinion.\"",
      footer: "Meditations by Marcus Aurelius — Book IV, Section 3-4"
    },
    {
      pageNumber: 3,
      header: "BOOK IV — THE NATURE OF THE WHOLE",
      title: "3. Universal Reason and Flow",
      paragraphs: [
        "If the intellectual capacity is common to us all, common too is the reason which makes us rational creatures. If so, common also is the reason which commands what we must do or not do; if so, there is a common law; if so, we are all citizens. And if so, we are all partners in one state; and the universe is a kind of commonwealth.",
        "For what other single state can all the human race be said to belong to? And it is from this, this common commonwealth, that our intellect, our reason, and our sense of law derive. Where else could they come from?",
        "Death, like birth, is a mystery of nature: a combination of elements in one, and a dissolution into the same elements in the other; and it is not at all a thing of which any person should be ashamed, for it is nothing contrary to the nature of an intellectual animal, nor contrary to the design of our constitution."
      ],
      quote: "\"We are made for cooperation, like feet, like hands, like the rows of the upper and lower teeth.\"",
      footer: "Meditations by Marcus Aurelius — Book IV, Section 4-5"
    },
    {
      pageNumber: 4,
      header: "BOOK IV — PERCEPTION AND SOVEREIGNTY",
      title: "4. Removing the Judgement",
      paragraphs: [
        "Get rid of the judgement, and you get rid of the complaint: 'I have been harmed.' Get rid of 'I have been harmed', and the harm itself vanishes.",
        "Whatever does not make the human being worse than he was does not make his life worse either, and cannot harm him from without or within. The nature of universal benefit has been compelled to do this.",
        "Remember that all which happens, happens justly. If you observe carefully, you will find this to be so. I do not mean merely according to the thread of events, but according to justice, and as if someone were distributing rewards according to merit.",
        "Observe then as you have begun, and whatever you do, do it with this in mind: to be good in the strict sense of what it is to be a human."
      ],
      quote: "\"Erase the impression; stem the impulse; quench the desire; keep the ruling power in its own control.\"",
      footer: "Meditations by Marcus Aurelius — Book IV, Section 7-10"
    },
    {
      pageNumber: 5,
      header: "BOOK IV — THE PASSING HOUR",
      title: "5. Completion and Serenity",
      paragraphs: [
        "Do not act as if you had ten thousand years to throw away. Unavoidable fate hangs over you. While you still have life, while you still have the chance, be good.",
        "How much leisure he gains who does not look to see what his neighbour says or does or thinks, but only at what he does himself, to ensure it is just and holy! Do not let your eyes wander toward dark characters, but run straight along the line to the goal, not turning aside.",
        "Everything in any way beautiful has its beauty in itself, and is complete in itself; praise is no part of it. At all events, what is praised becomes neither better nor worse. Does an emerald become worse than it was if it is not praised? Or gold, ivory, a sword, a flower, a vine?",
        "Pass through this brief patch of time in harmony with nature, and come to your journey's end with good grace, as an olive falls when it is ripe, blessing the earth that bore it and giving thanks to the tree on which it grew."
      ],
      quote: "\"Pass then through this little space of time conformably to nature, and end thy journey in contentment.\"",
      footer: "Meditations by Marcus Aurelius — Book IV, Section 17-20"
    }
  ];

  for (const p of pagesData) {
    // Standard US Letter dimensions (612 x 792 points)
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    // Top rule and Header
    page.drawText(p.header, {
      x: 54,
      y: height - 54,
      size: 9,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawLine({
      start: { x: 54, y: height - 64 },
      end: { x: width - 54, y: height - 64 },
      thickness: 0.75,
      color: rgb(0.75, 0.75, 0.75),
    });

    // Section Title
    page.drawText(p.title, {
      x: 54,
      y: height - 105,
      size: 18,
      font: timesRomanBold,
      color: rgb(0.12, 0.14, 0.18),
    });

    // Paragraphs
    let currentY = height - 140;
    const maxWidth = width - 108; // 504 pt width

    for (const paragraph of p.paragraphs) {
      // Simple word wrapping
      const words = paragraph.split(' ');
      let currentLine = '';
      const lines = [];

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = timesRoman.widthOfTextAtSize(testLine, 11);
        if (testWidth > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      for (const line of lines) {
        page.drawText(line, {
          x: 54,
          y: currentY,
          size: 11,
          font: timesRoman,
          color: rgb(0.18, 0.2, 0.24),
        });
        currentY -= 17;
      }
      currentY -= 10; // Paragraph gap
    }

    // Callout Box for Quote
    currentY -= 12;
    page.drawRectangle({
      x: 54,
      y: currentY - 44,
      width: maxWidth,
      height: 52,
      color: rgb(0.96, 0.95, 0.93),
      borderColor: rgb(0.82, 0.79, 0.73),
      borderWidth: 1,
    });

    page.drawText(p.quote, {
      x: 70,
      y: currentY - 20,
      size: 10.5,
      font: timesRomanItalic,
      color: rgb(0.25, 0.22, 0.18),
    });

    // Bottom Footer
    page.drawLine({
      start: { x: 54, y: 56 },
      end: { x: width - 54, y: 56 },
      thickness: 0.75,
      color: rgb(0.75, 0.75, 0.75),
    });

    page.drawText(p.footer, {
      x: 54,
      y: 40,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pageNumStr = `Page ${p.pageNumber}`;
    const pageNumWidth = helvetica.widthOfTextAtSize(pageNumStr, 9);
    page.drawText(pageNumStr, {
      x: width - 54 - pageNumWidth,
      y: 40,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve('public', 'sample-book.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Sample PDF successfully created at:', outputPath);
}

generateSamplePdf().catch(console.error);
