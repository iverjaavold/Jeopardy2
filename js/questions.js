/*
  ==========================================
  HER LEGGER DU INN SPØRSMÅLENE DINE
  ==========================================

  Du kan endre:
  - category: Navn på kategori
  - value: Poengsum
  - question: Spørsmålet
  - answer: Riktig svar

  Du kan legge til flere kategorier eller spørsmål.
*/

let QUESTIONS = [
  {
    category: "Geografi",
    clues: [
      {
        value: 100,
        question: "Hva er hovedstaden i Canada?",
        answer: "Ottawa"
      },
      {
        value: 200,
        question: "Hva er hovedstaden i Brasil?",
        answer: "Brasília"
      },
      {
        value: 300,
        question: "Hvilken hovedstad ligger lengst vest i Europa etter Reykjavik?",
        answer: "Lisboa"
      },
      {
        value: 400,
        question: "Knytt Finland til Scotland, mist antall land",
        answer: "Sverige - Danmark - Tyskland - Frankrike - England"
      },
      {
        value: 500,
        question: "Hvis du flyr rett sør fra Oslo, hvilket land kommer du til sist før Antarktis?",
        answer: "Gabon"
      }
    ]
  },
  {
    category: "Sport",
    clues: [
      {
        value: 100,
        question: "Hvilken sport spiller man i Wimbledon?",
        answer: "Tennis"
      },
      {
        value: 200,
        question: "Hvor mange ringer er det i OL-logoen?",
        answer: "5"
      },
      {
        value: 300,
        question: "Hvilken bokser var kjent som “The Greatest”?",
        answer: "Muhammad Ali"
      },
      {
        value: 400,
        question: "I hvilken idrett konkurrerer man i øvelsene støt og rykk?",
        answer: "Vektløfting"
      },
      {
        value: 500,
        question: "Sorter fra færrest til flest spillere på banen: fotball, håndball, hockey, basketball",
        answer: "Basketball, hockey, håndball, fotball"
      }
    ]
  },
  {
    category: "Kontor",
    clues: [
      {
        value: 100,
        question: "Hva heter Microsofts samarbeidsverktøy for chat og møter?",
        answer: "Teams"
      },
      {
        value: 200,
        question: "Hva står KPI for?",
        answer: "Key Performance Indicator"
      },
      {
        value: 300,
        question: "Hva heter selskapet Michael Scott jobber i?",
        answer: "Dunder Mifflin"
      },
      {
        value: 400,
        question: "Hva står CC for i mail-sammenheng?",
        answer: "Carbon copy"
      },
      {
        value: 500,
        question: "Hva står PDF for?",
        answer: "Portable Document Format"
      }
    ]
  },
  {
    category: "Blandet",
    clues: [
      {
        value: 100,
        question: "Hva kalles frosset vann?",
        answer: "Is"
      },
      {
        value: 200,
        question: "Hvilken planet er nærmest solen?",
        answer: "Merkur"
      },
      {
        value: 300,
        question: "Hva er Norges nasjonalfugl?",
        answer: "Fossekall"
      },
      {
        value: 400,
        question: "Hvem regisserte filmen Titanic fra 1997?",
        answer: "James Cameron"
      },
      {
        value: 500,
        question: "Hvilket år kom den første iPhone?",
        answer: "2007"
      }
    ]
  },
  {
    category: "Gåter",
    clues: [
      {
        value: 100,
        question: "Hva blir våtere og våtere jo mer det tørker?",
        answer: "Et håndkle"
      },
      {
        value: 200,
        question: "Hva blir større jo mer du tar bort?",
        answer: "Et hull"
      },
      {
        value: 300,
        question: "Hva har nøkler, men ingen låser?",
        answer: "Et piano"
      },
      {
        value: 400,
        question: "Hva har byer, veier og elver, men ingen mennesker, biler eller båter?",
        answer: "Et kart"
      },
      {
        value: 500,
        question: "Hva har flere hjerter, men ingen andre organer?",
        answer: "En kortstokk"
      }
    ]
  }
];


const DEFAULT_QUESTIONS = JSON.parse(JSON.stringify(QUESTIONS));
const QUESTION_STORAGE_KEY = "kontorJeopardyCustomQuestionsV1";

try {
  const savedQuestions = JSON.parse(localStorage.getItem(QUESTION_STORAGE_KEY) || "null");
  if (Array.isArray(savedQuestions) && savedQuestions.length > 0) {
    QUESTIONS = savedQuestions;
  }
} catch (error) {
  console.warn("Kunne ikke laste egendefinerte spørsmål.", error);
}

function cloneQuestions(source) {
  return JSON.parse(JSON.stringify(source));
}
