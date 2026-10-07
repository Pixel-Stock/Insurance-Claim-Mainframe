      ******************************************************************
      * PROVIDER MASTER RECORD - 60 BYTES                             *
      ******************************************************************
       01  PRVREC.
           05  PRV-PROVIDER-ID         PIC X(10).
           05  PRV-STATUS              PIC X.
               88  PRV-ACTIVE          VALUE 'A'.
               88  PRV-INACTIVE        VALUE 'I'.
               88  PRV-WATCHLIST       VALUE 'W'.
               88  PRV-SANCTIONED      VALUE 'S'.
           05  PRV-TYPE                PIC X(2).
           05  PRV-NETWORK-FLAG        PIC X.
               88  PRV-IN-NETWORK      VALUE 'Y'.
               88  PRV-OUT-NETWORK     VALUE 'N'.
           05  PRV-NAME                PIC X(30).
           05  FILLER                  PIC X(16).
