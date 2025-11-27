const themes = {
  // --- Business / Corporate ---
  default: {
    name: "Professional Card",
    category: "Business",
    backgroundColor: { rgbColor: { red: 0.96, green: 0.96, blue: 0.94 } }, // Light Cream
    primaryColor: { rgbColor: { red: 0.15, green: 0.56, blue: 0.50 } }, // Teal
    cardBackgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } }, // White
    headerTextStyle: {
      fontFamily: 'Montserrat',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } } }
    }
  },
  dark: {
    name: "Dark Modern",
    category: "Business",
    backgroundColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.12 } }, // Dark Gray
    primaryColor: { rgbColor: { red: 0.2, green: 0.6, blue: 0.86 } }, // Blue
    cardBackgroundColor: { rgbColor: { red: 0.18, green: 0.18, blue: 0.2 } }, // Darker Gray Card
    headerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.8, green: 0.8, blue: 0.8 } } }
    },
    bodyStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } } }
    }
  },
  light: {
    name: "Clean Light",
    category: "Business",
    backgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } }, // White
    primaryColor: { rgbColor: { red: 0.3, green: 0.3, blue: 0.3 } }, // Dark Gray Header
    cardBackgroundColor: { rgbColor: { red: 0.98, green: 0.98, blue: 0.98 } }, // Off-white Card
    headerTextStyle: {
      fontFamily: 'Open Sans',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Open Sans',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Open Sans',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } }
    }
  },
  quarterly: {
    name: "Quarterly Report",
    category: "Business",
    backgroundColor: { rgbColor: { red: 0.95, green: 0.95, blue: 0.98 } }, // Ice Blue
    primaryColor: { rgbColor: { red: 0.1, green: 0.2, blue: 0.4 } }, // Navy
    cardBackgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } },
    headerTextStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.8, green: 0.8, blue: 0.9 } } }
    },
    bodyStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.3 } } }
    }
  },

  // --- Cover ---
  bw_simple: {
    name: "B&W Simple",
    category: "Cover",
    backgroundColor: { rgbColor: { red: 0.0, green: 0.0, blue: 0.0 } }, // Black
    primaryColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } }, // White
    cardBackgroundColor: { rgbColor: { red: 0.0, green: 0.0, blue: 0.0 } }, // Black
    headerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 36, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 12, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.8, green: 0.8, blue: 0.8 } } }
    },
    bodyStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } } }
    }
  },
  product_pitch: {
    name: "Showstopping Pitch",
    category: "Cover",
    backgroundColor: { rgbColor: { red: 0.0, green: 0.0, blue: 0.0 } }, // Black
    primaryColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } }, // White
    cardBackgroundColor: { rgbColor: { red: 0.0, green: 0.0, blue: 0.0 } },
    headerTextStyle: {
      fontFamily: 'Oswald',
      fontSize: { magnitude: 50, unit: 'PT' }, // Huge
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Oswald',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.8, green: 0.8, blue: 0.8 } } }
    },
    bodyStyle: {
      fontFamily: 'Oswald',
      fontSize: { magnitude: 24, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    }
  },
  vibrant_yellow: {
    name: "Vibrant Yellow",
    category: "Cover",
    backgroundColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } }, // Dark Grey
    primaryColor: { rgbColor: { red: 1.0, green: 0.9, blue: 0.0 } }, // Yellow
    cardBackgroundColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } },
    headerTextStyle: {
      fontFamily: 'Anton',
      fontSize: { magnitude: 48, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 0.9, blue: 0.0 } } } // Yellow Text
    },
    footerTextStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 12, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Roboto',
      fontSize: { magnitude: 18, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    }
  },

  // --- Lecture / Education ---
  academic: {
    name: "Academic Blue",
    category: "Lecture",
    backgroundColor: { rgbColor: { red: 0.95, green: 0.97, blue: 1.0 } }, // Pale Blue
    primaryColor: { rgbColor: { red: 0.1, green: 0.3, blue: 0.6 } }, // Royal Blue
    cardBackgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } },
    headerTextStyle: {
      fontFamily: 'Merriweather',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Merriweather',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Merriweather',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.2 } } }
    }
  },
  blackboard: {
    name: "Blackboard",
    category: "Lecture",
    backgroundColor: { rgbColor: { red: 0.2, green: 0.3, blue: 0.25 } }, // Dark Green
    primaryColor: { rgbColor: { red: 0.9, green: 0.8, blue: 0.4 } }, // Chalk Yellow
    cardBackgroundColor: { rgbColor: { red: 0.25, green: 0.35, blue: 0.3 } }, // Lighter Green
    headerTextStyle: {
      fontFamily: 'Patrick Hand',
      fontSize: { magnitude: 28, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Patrick Hand',
      fontSize: { magnitude: 12, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } } }
    },
    bodyStyle: {
      fontFamily: 'Patrick Hand',
      fontSize: { magnitude: 16, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    }
  },

  // --- Pitch Deck ---
  startup: {
    name: "Startup Bold",
    category: "Pitch Deck",
    backgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } },
    primaryColor: { rgbColor: { red: 1.0, green: 0.3, blue: 0.0 } }, // Orange
    cardBackgroundColor: { rgbColor: { red: 0.98, green: 0.98, blue: 0.98 } },
    headerTextStyle: {
      fontFamily: 'Poppins',
      fontSize: { magnitude: 26, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Poppins',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Poppins',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } }
    }
  },
  investor: {
    name: "Investor Clean",
    category: "Pitch Deck",
    backgroundColor: { rgbColor: { red: 0.98, green: 0.98, blue: 1.0 } },
    primaryColor: { rgbColor: { red: 0.1, green: 0.1, blue: 0.4 } }, // Deep Blue
    cardBackgroundColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } },
    headerTextStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    footerTextStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 10, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 1.0, green: 1.0, blue: 1.0 } } }
    },
    bodyStyle: {
      fontFamily: 'Lato',
      fontSize: { magnitude: 14, unit: 'PT' },
      foregroundColor: { opaqueColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } } }
    }
  }
};

module.exports = themes;
