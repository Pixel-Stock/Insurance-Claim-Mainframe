       IDENTIFICATION DIVISION.
       PROGRAM-ID. CLMDATE.
      ******************************************************************
      * DATE VALIDATION AND CONVERSION UTILITY                         *
      * VALIDATES YYYYMMDD FORMAT AND CONVERTS TO DAY NUMBER           *
      ******************************************************************
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-DAYS-IN-MONTH.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 28.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 30.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 30.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 30.
           05  FILLER PIC 99 VALUE 31.
           05  FILLER PIC 99 VALUE 30.
           05  FILLER PIC 99 VALUE 31.
       01  WS-MONTH-TABLE REDEFINES WS-DAYS-IN-MONTH.
           05  WS-MONTH-DAYS PIC 99 OCCURS 12 TIMES.
       
       01  WS-WORK-VARS.
           05  WS-YEAR         PIC 9(4).
           05  WS-MONTH        PIC 9(2).
           05  WS-DAY          PIC 9(2).
           05  WS-DAYS         PIC 9(7).
           05  WS-LEAP-DAYS    PIC 9(3).
           05  WS-MAX-DAY      PIC 9(2).
           05  WS-I            PIC 9(2).
           05  WS-Q            PIC 9(4).
           05  WS-R            PIC 9(4).
       
       LINKAGE SECTION.
       01  LS-DATE-INPUT       PIC 9(8).
       01  LS-DATE-VALID       PIC X.
       01  LS-DAY-NUMBER       PIC 9(7).
       
       PROCEDURE DIVISION USING LS-DATE-INPUT
                                LS-DATE-VALID
                                LS-DAY-NUMBER.
       
       MAIN-LOGIC.
           MOVE 'N' TO LS-DATE-VALID
           MOVE ZERO TO LS-DAY-NUMBER
           
           IF LS-DATE-INPUT = ZERO
               GO TO END-PROGRAM
           END-IF
           
           DIVIDE LS-DATE-INPUT BY 10000 GIVING WS-YEAR
                                        REMAINDER WS-Q
           DIVIDE WS-Q BY 100 GIVING WS-MONTH REMAINDER WS-DAY
           
           IF WS-YEAR < 1900 OR WS-YEAR > 2099
               GO TO END-PROGRAM
           END-IF
           
           IF WS-MONTH < 1 OR WS-MONTH > 12
               GO TO END-PROGRAM
           END-IF
           
           IF WS-DAY < 1
               GO TO END-PROGRAM
           END-IF
           
           MOVE WS-MONTH-DAYS(WS-MONTH) TO WS-MAX-DAY
           
           IF WS-MONTH = 2
               DIVIDE WS-YEAR BY 4 GIVING WS-Q REMAINDER WS-R
               IF WS-R = ZERO
                   DIVIDE WS-YEAR BY 100 GIVING WS-Q REMAINDER WS-R
                   IF WS-R NOT = ZERO
                       MOVE 29 TO WS-MAX-DAY
                   ELSE
                       DIVIDE WS-YEAR BY 400 GIVING WS-Q REMAINDER WS-R
                       IF WS-R = ZERO
                           MOVE 29 TO WS-MAX-DAY
                       END-IF
                   END-IF
               END-IF
           END-IF
           
           IF WS-DAY > WS-MAX-DAY
               GO TO END-PROGRAM
           END-IF
           
           MOVE 'Y' TO LS-DATE-VALID
           
           COMPUTE WS-DAYS = (WS-YEAR - 1900) * 365
           DIVIDE WS-YEAR BY 4 GIVING WS-Q
           DIVIDE 1900 BY 4 GIVING WS-R
           COMPUTE WS-LEAP-DAYS = WS-Q - WS-R
           ADD WS-LEAP-DAYS TO WS-DAYS
           
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I >= WS-MONTH
               ADD WS-MONTH-DAYS(WS-I) TO WS-DAYS
           END-PERFORM
           
           IF WS-MONTH > 2
               DIVIDE WS-YEAR BY 4 GIVING WS-Q REMAINDER WS-R
               IF WS-R = ZERO
                   DIVIDE WS-YEAR BY 100 GIVING WS-Q REMAINDER WS-R
                   IF WS-R NOT = ZERO
                       ADD 1 TO WS-DAYS
                   ELSE
                       DIVIDE WS-YEAR BY 400 GIVING WS-Q REMAINDER WS-R
                       IF WS-R = ZERO
                           ADD 1 TO WS-DAYS
                       END-IF
                   END-IF
               END-IF
           END-IF
           
           ADD WS-DAY TO WS-DAYS
           MOVE WS-DAYS TO LS-DAY-NUMBER.
           
       END-PROGRAM.
           GOBACK.
