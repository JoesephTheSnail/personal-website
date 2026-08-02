// Shared between the Projects grid tiles (client) and the project detail
// page (server) so both sides tag the same element with the same
// `view-transition-name`, letting the browser morph the clicked tile
// directly into the destination page instead of a plain cut.
export function projectCardTransitionName(slug: string): string {
  return `project-card-${slug}`;
}
