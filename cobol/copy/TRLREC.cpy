      ******************************************************************
      * TRAILER RECORD - 120 BYTES                                    *
      ******************************************************************
       01  TRLREC.
           05  TRL-REC-TYPE            PIC X.
               88  TRL-VALID           VALUE 'T'.
           05  TRL-COUNT               PIC 9(9).
           05  TRL-AMOUNT              PIC 9(11)V99.
           05  FILLER                  PIC X(97).
