<?php
// app/Models/TicketHistory.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketHistory extends Model
{
    public $timestamps = false;
    protected $table = 'ticket_history';
    protected $fillable = ['ticket_id', 'action', 'user', 'user_id', 'timestamp', 'details'];
    protected $casts = ['timestamp' => 'datetime'];
    public function ticket() { return $this->belongsTo(Ticket::class); }
}
