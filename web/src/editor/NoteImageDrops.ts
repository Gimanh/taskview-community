export class NoteImageDrops {
  private static readonly events = new WeakSet<Event>()

  static take(event: Event) {
    this.events.add(event)
  }

  static taken(event: Event): boolean {
    return this.events.has(event)
  }
}
