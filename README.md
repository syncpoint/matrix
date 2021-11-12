# matrix

ODIN/NIDO ist bisher auf die lokale Bearbeitung der Daten beschränkt. Die einzige Möglichkeit diese Daten auszutauschen ist der Export und Re-Import von Layern oder Projekten. 

Mit ODIN v2 soll die Möglichkeit geschaffen werden, sowohl kollaborativ in Echtzeit zusammen zu arbeiten als auch den für die Stabsarbeit typischen Arbeitsablauf (Freigaben, ...) abzubilden. Als technisches Vehikel für die Replikation haben wir das [Matrix](https://matrix.org) Ökosystem ausgewählt, da es so wie ODIN Open Source ist und aus jetziger Sicht alle grundsätzlichen Anforderungen erfüllen kann.

Für die Replikation von Daten verwenden wir die Spezifikation für das __Messaging__. Das bedeutet, dass lokale Änderungen an ODIN Objekten als _Nachricht_ in einem _Raum_ publiziert werden. Andere Kommunikationspartner können diese Nachrichten lesen und die darin enthaltenen Daten/Anweisungen interpretieren, um das betroffene ODIN Objekt in den selben Zustand wie das Original zu bringen.

In seiner allgemeinsten Form ist die Replikation als _jeder-mit-jedem_ zu sehen. Erweiterte bzw. einschränkende Anforderungen wie z.B. _einer-an-alle_ werden über die Berechtigungskonzepte von Matrix abgebildet.

## Elemente

In ODIN verwenden wir Projekte und Layer um Daten zu strukturieren. Diese Konzepte wollen wir auch bei der Replikation beibehalten und müssen entsprechende Analogien aus der Matrix welt dafür finden.

### Projekt

Ein Projekt in ODIN ist ein Container, in dem eine beliebige Anzahl von Layern und Einstellungen wie z.B. die verwendeten Basiskarten zusammengefasst sind.

### Layer

Ein Layer ist ein Container für eine beliebige Anzahl von Features.

### Feature

Ein Feature ist ein darstellbares und geographisch verortetes Objekt. Jedem Feature sind ein oder mehrere Geometrien und eine Menge von Eigenschaften zugeordnet.

## Abbildungen

Das primäre Container Element in Matrix ist der _Raum_. Mit der aktuellen Spezifikation (nov21) ist es möglich, Räume in hierarchische Strukturen zu unterteilen. Sogenannte _Spaces_ sind Räume, die wiederum Räume als Kind-Elemente enthalten können.

Die Abbildung ODIN <-> Matrix sieht wie folgt aus:

  * Projekt <-> Raum (Space)
  * Layer <-> Raum (Kind-Element des Raums, der als Space ausgewählt wurde)

## Matrix Referenz

Leider gibt es in der offiziellen Doku noch keine Abschnitte zum Thema _Spaces_. Allerdings existiert ein [Proposal for "spaces"](https://github.com/matrix-org/matrix-doc/blob/old_master/proposals/1772-groups-as-rooms.md), aus dem sich die wichtigsten Abläufe und Events ableiten lassen.

## Nachrichten

ODIN Features werden nicht explizit übertragen. In den einlenen Layern zugeordneten Räumen werden die internen vom Store aggregierten Kommandos als Nachrichten publiziert. Bei bestimmten Aktionen wie beispielswiese die Freigabe eines Planes oder Anforderung zur Absegnung eines Planes durch den Komandanten werden Snapshots der entsprechenden Layers verschickt. 

### Aufbau 

Jede Nachricht enthält mindestens einen Nachrichtentyp, einen Raum und die Payload.

### Nachrichtenstrom

Die Nachrichten werden entsprechen dem Event Sourcing Ansatz zeitlich geordnet abgelegt und aggregiert zu Snapshots aggregiert. Für Aktionen wie die Freigabe eines Plans werden ähnlich den Tags im Git Workflow Snapshots erzeugt. Diese Snapshots können nicht verändert werden. Weiterführende Änderungen – wiederum als Events zeitlich geordnet abgelegt – beeinflussen bestehende Snapshot nicht.  

Um den benutzen Speicherplatz bei Bedarf zu begrenzen, können einzelne Events zu einem technischen Snapshot aggregiert und archiviert werden.  

Snapshot können fachlich - Freigabe - oder technisch - Archivierung - motiviert sein. 

![image-20211108110230894](event_stream.png)



## Use-Cases

Für alle nachstehenden Use-Cases müssen die teilehmenden Benutzer über einen Account beim Matrix Server haben und auch angemeldet sein. Über das _Auto-Join_ Flag kann beeinflusst werden, ob Einladungen in Räume bzw. Spaces ohne weiteres Zutun des Benutzers automatisch angenommen werden. 

__TODO__: Entscheiden, ob Auto-Join gewünscht ist.

### Projekt teilen

Ein Benutzer erstellt ein lokales ODIN Projekt und legt zwei Layer an. Dann entscheidet er, dass dieses Projekt mit anderen geteilt werden soll. Im Zuge des Vorgangs "teilen" wird

 1) ein Space angelegt, der mit dem Projekt verknüpft ist
 2) für jeden existierenden Layer ein Raum angelegt und mit dem Layer verknüpft
 3) Defaults für den Power-Level der Räume und der Benutzer festgelegt (__TODO__: prüfen, ob diese Defaults/Policy auf dem Server festgelegt werden können)
 4) eine Einladung für die ausgewählten Benutzer für die Teilnahme am Project Space erstellt

### Layer teilen

Grundsätzlich werden neue Layer nicht automatisch geteilt. Wird ein neuer Layer erstellt, könnte das Teil des Dialogs sein.

### Benutzer einladen (Projekt bzw. Layer)

Wird ein Benutzer zu einem Projekt eingeladen, dann

  1) Wird er Mitglied im Space
  2) Über die Eltern-Kind Beziehungen im Space könne alle geteilten Layer enumeriert werden ("getRoomHierarchy")
  3) kann er automatisch alle Räume/Layer betreten, bei denen Auto-Join eingeschaltet ist

### Teilen eines Layers zurücknehmen

Um einen geteilten Layer zurückzunehmen, müssen ausgewählte/alle Benutzer aus dem Raum entfernt werden.

  1) Der Eigentümer "A" entfernt Benutzer "B" aus dem Raum ("kick").
  2) Die ODIN Instanz von Benutzer "B" muss auf dieses Event reagieren und die lokale Kopie des betroffenen 
  (dem Raum zugeordneten) Layers löschen. Um zu verhindern, dass der Benutzer wieder den Raum betreten kann, 
  kann er "verbannt" ("ban") werden.





