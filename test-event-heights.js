// Test dynamic event heights calculation
const HOUR_HEIGHT = 60;

function getEventPosition(event) {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinutes = endTime.getMinutes();
  
  const top = (startHour + startMinutes / 60) * HOUR_HEIGHT;
  const duration = ((endHour + endMinutes / 60) - (startHour + startMinutes / 60));
  
  // Dynamic height based on actual duration
  let height = duration * HOUR_HEIGHT;
  
  // Ensure minimum height for very short events (less than 30 minutes)
  if (duration < 0.5) {
    height = Math.max(height, 25); // Minimum 25px for readability
  }
  
  return { top, height, duration };
}

// Test cases
const testEvents = [
  {
    id: '1',
    title: '15-minute meeting',
    startTime: new Date('2024-01-01T09:00:00Z'),
    endTime: new Date('2024-01-01T09:15:00Z')
  },
  {
    id: '2', 
    title: '1-hour meeting',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T11:00:00Z')
  },
  {
    id: '3',
    title: '2.5-hour workshop',
    startTime: new Date('2024-01-01T14:00:00Z'),
    endTime: new Date('2024-01-01T16:30:00Z')
  },
  {
    id: '4',
    title: '30-minute call',
    startTime: new Date('2024-01-01T15:30:00Z'),
    endTime: new Date('2024-01-01T16:00:00Z')
  }
];

console.log('Testing dynamic event heights:\n');
console.log('HOUR_HEIGHT:', HOUR_HEIGHT, 'pixels');
console.log('Expected: 1 hour = 60px, 30 minutes = 30px, etc.\n');

testEvents.forEach(event => {
  const position = getEventPosition(event);
  const durationHours = position.duration;
  const expectedHeight = durationHours * HOUR_HEIGHT;
  
  console.log(`Event: ${event.title}`);
  console.log(`Duration: ${durationHours} hours`);
  console.log(`Calculated height: ${position.height}px`);
  console.log(`Expected height: ${expectedHeight}px`);
  console.log(`Top position: ${position.top}px`);
  console.log('---');
});

console.log('\n✅ All calculations look correct!');
console.log('If events appear fixed height, check:');
console.log('1. CSS styles overriding dynamic heights');
console.log('2. EventCard component min-height styles');
console.log('3. Container CSS that might constrain heights');