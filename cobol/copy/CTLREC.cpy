      ******************************************************************
      * CONTROL TOTAL RECORD - 80 BYTES                               *
      * TYPES: RD=Records read, TR=Trailer, DS=Disposition totals     *
      *        RL=Rule totals, PM=Parameter echo                      *
      ******************************************************************
       01  CTLREC.
           05  CTL-TYPE                PIC X(2).
               88  CTL-RECORDS-READ    VALUE 'RD'.
               88  CTL-TRAILER         VALUE 'TR'.
               88  CTL-DISPOSITION     VALUE 'DS'.
               88  CTL-RULE            VALUE 'RL'.
               88  CTL-PARAM           VALUE 'PM'.
           05  CTL-KEY                 PIC X(4).
           05  CTL-COUNT               PIC 9(9).
           05  CTL-AMOUNT              PIC 9(11)V99.
           05  CTL-RUN-ID              PIC X(14).
           05  FILLER                  PIC X(38).
