const toNameUrlList = (list) =>
  (list || []).map((item) => (typeof item === 'string' ? { name: item, url: '' } : item));

export function submissionToEventPreview(submission) {
  return {
    id: submission.id,
    event_type: submission.event_type || [],
    title: submission.title,
    start_date: submission.start_date,
    start_time: submission.start_time,
    end_date: submission.end_date,
    end_time: submission.end_time,
    price: submission.price === null || submission.price === undefined ? null : Number(submission.price),
    participation_type: submission.participation_type || [],
    city: submission.city || [],
    address: submission.address,
    event_url: submission.event_url,
    registration_url: submission.registration_url,
    track: submission.track || [],
    tags: [],
    description: submission.description,
    organizers: toNameUrlList(submission.organizers),
    speakers: toNameUrlList(submission.speakers),
  };
}
